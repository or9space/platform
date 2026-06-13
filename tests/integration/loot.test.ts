import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import {
  getMemberBalance, listLootMembersWithBalances, getSessionWithGrid, listMemberTransactions,
} from "@/lib/queries/loot";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";
import {
  createLootMemberCore, createSessionCore, setAttendanceCore,
  spendLootCore, adjustLootCore, transferLootCore,
} from "@/lib/actions/loot-core";

const ctxA = makeTenantContext(TENANT_A.id);

async function lootMember(tenantId: string, displayName: string) {
  return testPrisma.lootMember.create({ data: { tenantId, displayName } });
}
async function session(tenantId: string, label: string) {
  return testPrisma.lootSession.create({ data: { tenantId, label, sessionDate: new Date(), createdByMembershipId: "seed" } });
}
async function att(tenantId: string, sessionId: string, memberId: string, status: string) {
  return testPrisma.lootAttendance.create({ data: { tenantId, sessionId, memberId, status: status as never } });
}
async function txn(tenantId: string, memberId: string, amountTenths: number, type: string) {
  return testPrisma.lootTransaction.create({ data: { tenantId, memberId, amountTenths, type: type as never, createdByMembershipId: "seed" } });
}

describe("loot queries", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.lootTransaction.deleteMany({});
    await testPrisma.lootAttendance.deleteMany({});
    await testPrisma.lootSession.deleteMany({});
    await testPrisma.lootMember.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("getMemberBalance = sum(attendance points) + sum(txn tenths), tenant-scoped", async () => {
    const m = await lootMember(TENANT_A.id, "Alpha");
    const s1 = await session(TENANT_A.id, "S1");
    const s2 = await session(TENANT_A.id, "S2");
    await att(TENANT_A.id, s1.id, m.id, "PRESENT");   // +10
    await att(TENANT_A.id, s2.id, m.id, "LATE");       // +5
    await txn(TENANT_A.id, m.id, -30, "SPEND");        // -30
    expect(await getMemberBalance(ctxA, m.id)).toBe(-15);  // 10 + 5 - 30
  });

  it("balance is 0 for a member with no activity", async () => {
    const m = await lootMember(TENANT_A.id, "Empty");
    expect(await getMemberBalance(ctxA, m.id)).toBe(0);
  });

  it("listLootMembersWithBalances returns this tenant's members sorted by balance desc", async () => {
    const a = await lootMember(TENANT_A.id, "Rich");
    const b = await lootMember(TENANT_A.id, "Poor");
    const s = await session(TENANT_A.id, "S");
    await att(TENANT_A.id, s.id, a.id, "PRESENT");  // Rich +10
    await txn(TENANT_A.id, b.id, -5, "SPEND");       // Poor -5
    // tenant B noise
    const bm = await lootMember(TENANT_B.id, "BRAVO");
    await txn(TENANT_B.id, bm.id, 999, "ADJUST");
    const rows = await listLootMembersWithBalances(ctxA);
    expect(rows.map((r) => r.displayName)).toEqual(["Rich", "Poor"]);
    expect(rows[0].balanceTenths).toBe(10);
    expect(rows[1].balanceTenths).toBe(-5);
    expect(rows.some((r) => r.displayName === "BRAVO")).toBe(false);
  });

  it("getSessionWithGrid returns the session + attendance rows with member names", async () => {
    const m = await lootMember(TENANT_A.id, "Alpha");
    const s = await session(TENANT_A.id, "Friday Op");
    await att(TENANT_A.id, s.id, m.id, "PRESENT");
    const g = await getSessionWithGrid(ctxA, s.id);
    expect(g?.label).toBe("Friday Op");
    expect(g?.rows[0].displayName).toBe("Alpha");
    expect(g?.rows[0].status).toBe("PRESENT");
  });

  it("getSessionWithGrid returns null for another tenant's session", async () => {
    const bs = await session(TENANT_B.id, "B");
    expect(await getSessionWithGrid(ctxA, bs.id)).toBeNull();
  });

  it("listMemberTransactions newest-first, tenant-scoped", async () => {
    const m = await lootMember(TENANT_A.id, "Alpha");
    await txn(TENANT_A.id, m.id, 10, "ADJUST");
    await txn(TENANT_A.id, m.id, -5, "SPEND");
    const rows = await listMemberTransactions(ctxA, m.id);
    expect(rows).toHaveLength(2);
    expect(rows[0].type).toBe("SPEND");  // newest first
  });
});

async function membership(tenantId: string, username: string, tier: string) {
  const acc = await testPrisma.account.create({ data: { email: `${username}-${Math.random().toString(36).slice(2,6)}@it.example` } });
  return testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username, tier: tier as never } });
}

describe("loot write actions", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.lootTransaction.deleteMany({});
    await testPrisma.lootAttendance.deleteMany({});
    await testPrisma.lootSession.deleteMany({});
    await testPrisma.lootMember.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("OFFICER creates a loot member (off-site, no membership)", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const r = await createLootMemberCore(TENANT_A.id, off.id, "OFFICER", { displayName: "Gamertag99" });
    expect(r.ok).toBe(true);
  });

  it("ENLISTED cannot create a loot member", async () => {
    const m = await membership(TENANT_A.id, "grunt", "ENLISTED");
    const r = await createLootMemberCore(TENANT_A.id, m.id, "ENLISTED", { displayName: "x" });
    expect(r.ok).toBe(false);
  });

  it("OFFICER creates a session and sets attendance (affects balance)", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const lm = await createLootMemberCore(TENANT_A.id, off.id, "OFFICER", { displayName: "P" });
    if (!lm.ok) throw new Error();
    const s = await createSessionCore(TENANT_A.id, off.id, "OFFICER", { label: "Op", sessionDate: new Date().toISOString() });
    if (!s.ok) throw new Error();
    const att = await setAttendanceCore(TENANT_A.id, off.id, "OFFICER", { sessionId: s.sessionId, memberId: lm.memberId, status: "PRESENT" });
    expect(att.ok).toBe(true);
    const bal = await testPrisma.lootAttendance.findMany({ where: { memberId: lm.memberId } });
    expect(bal).toHaveLength(1);
  });

  it("setAttendance upsert: changing PRESENT->LATE updates the row, not duplicates", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const lm = await createLootMemberCore(TENANT_A.id, off.id, "OFFICER", { displayName: "P" });
    if (!lm.ok) throw new Error();
    const s = await createSessionCore(TENANT_A.id, off.id, "OFFICER", { label: "Op", sessionDate: new Date().toISOString() });
    if (!s.ok) throw new Error();
    await setAttendanceCore(TENANT_A.id, off.id, "OFFICER", { sessionId: s.sessionId, memberId: lm.memberId, status: "PRESENT" });
    await setAttendanceCore(TENANT_A.id, off.id, "OFFICER", { sessionId: s.sessionId, memberId: lm.memberId, status: "LATE" });
    const rows = await testPrisma.lootAttendance.findMany({ where: { sessionId: s.sessionId, memberId: lm.memberId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("LATE");
  });

  it("spend deducts; rejects overdraw and non-positive", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const lm = await createLootMemberCore(TENANT_A.id, off.id, "OFFICER", { displayName: "P" });
    if (!lm.ok) throw new Error();
    // give them 20 tenths via an ADJUST by COMMAND
    const cmd = await membership(TENANT_A.id, "cmd", "COMMAND");
    await adjustLootCore(TENANT_A.id, cmd.id, cmd.accountId, "COMMAND", { memberId: lm.memberId, amountTenths: 20, note: "seed" });
    const over = await spendLootCore(TENANT_A.id, off.id, "OFFICER", { memberId: lm.memberId, amountTenths: 50, note: "too much" });
    expect(over.ok).toBe(false);  // overdraw
    const bad = await spendLootCore(TENANT_A.id, off.id, "OFFICER", { memberId: lm.memberId, amountTenths: 0, note: "x" });
    expect(bad.ok).toBe(false);   // non-positive
    const ok = await spendLootCore(TENANT_A.id, off.id, "OFFICER", { memberId: lm.memberId, amountTenths: 15, note: "ok" });
    expect(ok.ok).toBe(true);
    const txns = await testPrisma.lootTransaction.findMany({ where: { memberId: lm.memberId, type: "SPEND" } });
    expect(txns).toHaveLength(1);
    expect(txns[0].amountTenths).toBe(-15);  // stored signed negative
  });

  it("ENLISTED cannot spend", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const lm = await createLootMemberCore(TENANT_A.id, off.id, "OFFICER", { displayName: "P" });
    if (!lm.ok) throw new Error();
    const grunt = await membership(TENANT_A.id, "grunt", "ENLISTED");
    const r = await spendLootCore(TENANT_A.id, grunt.id, "ENLISTED", { memberId: lm.memberId, amountTenths: 5, note: "x" });
    expect(r.ok).toBe(false);
  });

  it("adjust requires COMMAND and writes an audit row", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const lm = await createLootMemberCore(TENANT_A.id, off.id, "OFFICER", { displayName: "P" });
    if (!lm.ok) throw new Error();
    const denied = await adjustLootCore(TENANT_A.id, off.id, off.accountId, "OFFICER", { memberId: lm.memberId, amountTenths: 10, note: "x" });
    expect(denied.ok).toBe(false);
    const cmd = await membership(TENANT_A.id, "cmd", "COMMAND");
    const ok = await adjustLootCore(TENANT_A.id, cmd.id, cmd.accountId, "COMMAND", { memberId: lm.memberId, amountTenths: -5, note: "correction" });
    expect(ok.ok).toBe(true);
    const audit = await testPrisma.auditLog.findFirst({ where: { tenantId: TENANT_A.id, action: "loot.adjust" } });
    expect(audit).not.toBeNull();
  });

  it("transfer moves points atomically; rejects overdraw and self-transfer", async () => {
    const cmd = await membership(TENANT_A.id, "cmd", "COMMAND");
    const a = await createLootMemberCore(TENANT_A.id, cmd.id, "OFFICER", { displayName: "A", membershipId: cmd.id });
    const b = await createLootMemberCore(TENANT_A.id, cmd.id, "OFFICER", { displayName: "B" });
    if (!a.ok || !b.ok) throw new Error();
    await adjustLootCore(TENANT_A.id, cmd.id, cmd.accountId, "COMMAND", { memberId: a.memberId, amountTenths: 30, note: "seed" });
    // overdraw
    const over = await transferLootCore(TENANT_A.id, cmd.id, a.memberId, { toMemberId: b.memberId, amountTenths: 40, note: "x" });
    expect(over.ok).toBe(false);
    // self
    const self = await transferLootCore(TENANT_A.id, cmd.id, a.memberId, { toMemberId: a.memberId, amountTenths: 5, note: "x" });
    expect(self.ok).toBe(false);
    // ok
    const ok = await transferLootCore(TENANT_A.id, cmd.id, a.memberId, { toMemberId: b.memberId, amountTenths: 20, note: "gift" });
    expect(ok.ok).toBe(true);
    const outTxn = await testPrisma.lootTransaction.findFirst({ where: { memberId: a.memberId, type: "TRANSFER_OUT" } });
    const inTxn = await testPrisma.lootTransaction.findFirst({ where: { memberId: b.memberId, type: "TRANSFER_IN" } });
    expect(outTxn?.amountTenths).toBe(-20);
    expect(inTxn?.amountTenths).toBe(20);
  });

  it("transfer concurrent: balance can never go negative", async () => {
    const cmd = await membership(TENANT_A.id, "cmd", "COMMAND");
    const a = await createLootMemberCore(TENANT_A.id, cmd.id, "OFFICER", { displayName: "A", membershipId: cmd.id });
    const b = await createLootMemberCore(TENANT_A.id, cmd.id, "OFFICER", { displayName: "B" });
    if (!a.ok || !b.ok) throw new Error();
    await adjustLootCore(TENANT_A.id, cmd.id, cmd.accountId, "COMMAND", { memberId: a.memberId, amountTenths: 30, note: "seed" });
    // two concurrent 20-transfers; only one can succeed (30 balance)
    await Promise.allSettled([
      transferLootCore(TENANT_A.id, cmd.id, a.memberId, { toMemberId: b.memberId, amountTenths: 20, note: "1" }),
      transferLootCore(TENANT_A.id, cmd.id, a.memberId, { toMemberId: b.memberId, amountTenths: 20, note: "2" }),
    ]);
    // A's balance must never be negative
    const txns = await testPrisma.lootTransaction.findMany({ where: { memberId: a.memberId } });
    const trueBal = txns.reduce((s, t) => s + t.amountTenths, 0);
    expect(trueBal).toBeGreaterThanOrEqual(0);
  });

  it("cannot transfer to another tenant's member", async () => {
    const cmd = await membership(TENANT_A.id, "cmd", "COMMAND");
    const a = await createLootMemberCore(TENANT_A.id, cmd.id, "OFFICER", { displayName: "A", membershipId: cmd.id });
    if (!a.ok) throw new Error();
    await adjustLootCore(TENANT_A.id, cmd.id, cmd.accountId, "COMMAND", { memberId: a.memberId, amountTenths: 30, note: "seed" });
    const bMemberOtherTenant = await testPrisma.lootMember.create({ data: { tenantId: TENANT_B.id, displayName: "Bm" } });
    const r = await transferLootCore(TENANT_A.id, cmd.id, a.memberId, { toMemberId: bMemberOtherTenant.id, amountTenths: 10, note: "x" });
    expect(r.ok).toBe(false);
  });

  it("cannot transfer FROM a loot member you do not own", async () => {
    const cmd = await membership(TENANT_A.id, "cmd", "COMMAND");
    // two loot members linked to two different memberships
    const aMs = await membership(TENANT_A.id, "alice", "OFFICER");
    const bMs = await membership(TENANT_A.id, "bob", "ENLISTED");
    const aLm = await createLootMemberCore(TENANT_A.id, cmd.id, "OFFICER", { displayName: "Alice", membershipId: aMs.id });
    const bLm = await createLootMemberCore(TENANT_A.id, cmd.id, "OFFICER", { displayName: "Bob", membershipId: bMs.id });
    if (!aLm.ok || !bLm.ok) throw new Error();
    await adjustLootCore(TENANT_A.id, cmd.id, cmd.accountId, "COMMAND", { memberId: aLm.memberId, amountTenths: 50, note: "seed" });
    // Bob (bMs) tries to transfer FROM Alice's loot member -> must be rejected
    const r = await transferLootCore(TENANT_A.id, bMs.id, aLm.memberId, { toMemberId: bLm.memberId, amountTenths: 20, note: "theft" });
    expect(r.ok).toBe(false);
    // Alice's balance unchanged (no TRANSFER_OUT)
    const stolen = await testPrisma.lootTransaction.findFirst({ where: { memberId: aLm.memberId, type: "TRANSFER_OUT" } });
    expect(stolen).toBeNull();
  });
});
