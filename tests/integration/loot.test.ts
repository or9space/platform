import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import {
  getMemberBalance, listLootMembersWithBalances, getSessionWithGrid, listMemberTransactions,
} from "@/lib/queries/loot";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

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
