import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listTreasuryEntries, getTreasuryBalance, getTreasurySummary } from "@/lib/queries/treasury";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";
import { createTreasuryEntryCore, deleteTreasuryEntryCore } from "@/lib/actions/treasury-core";

const ctxA = makeTenantContext(TENANT_A.id);

async function mkMember(tenantId: string, username: string) {
  const acc = await testPrisma.account.create({ data: { email: `${username}-${Math.random().toString(36).slice(2,6)}@it.example` } });
  return testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username, tier: "OFFICER" } });
}
async function entry(tenantId: string, authorId: string, type: string, category: string, amount: number, description = "x") {
  return testPrisma.treasuryEntry.create({ data: { tenantId, authorMembershipId: authorId, type: type as never, category: category as never, amount, description } });
}

describe("treasury queries", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.treasuryEntry.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("getTreasuryBalance = sum(income) - sum(expense), tenant-scoped", async () => {
    const mA = await mkMember(TENANT_A.id, "ta");
    await entry(TENANT_A.id, mA.id, "INCOME", "DONATION", 1000);
    await entry(TENANT_A.id, mA.id, "INCOME", "MINING", 500);
    await entry(TENANT_A.id, mA.id, "EXPENSE", "PURCHASE", 300);
    const mB = await mkMember(TENANT_B.id, "tb");
    await entry(TENANT_B.id, mB.id, "INCOME", "DONATION", 9999);
    expect(await getTreasuryBalance(ctxA)).toBe(1200);
  });

  it("listTreasuryEntries returns this tenant's entries newest-first with author name", async () => {
    const mA = await mkMember(TENANT_A.id, "ta");
    await entry(TENANT_A.id, mA.id, "INCOME", "DONATION", 100, "first");
    await entry(TENANT_A.id, mA.id, "EXPENSE", "PAYOUT", 50, "second");
    const rows = await listTreasuryEntries(ctxA);
    expect(rows).toHaveLength(2);
    expect(rows[0].description).toBe("second");
    expect(rows[0].authorName).toBe("ta");
  });

  it("listTreasuryEntries filters by type", async () => {
    const mA = await mkMember(TENANT_A.id, "ta");
    await entry(TENANT_A.id, mA.id, "INCOME", "DONATION", 100);
    await entry(TENANT_A.id, mA.id, "EXPENSE", "PAYOUT", 50);
    const inc = await listTreasuryEntries(ctxA, { type: "INCOME" });
    expect(inc).toHaveLength(1);
    expect(inc[0].type).toBe("INCOME");
  });

  it("getTreasurySummary totals income/expense and per-category", async () => {
    const mA = await mkMember(TENANT_A.id, "ta");
    await entry(TENANT_A.id, mA.id, "INCOME", "MINING", 700);
    await entry(TENANT_A.id, mA.id, "INCOME", "MINING", 300);
    await entry(TENANT_A.id, mA.id, "EXPENSE", "PURCHASE", 200);
    const s = await getTreasurySummary(ctxA);
    expect(s.totalIncome).toBe(1000);
    expect(s.totalExpense).toBe(200);
    expect(s.byCategory.MINING).toBe(1000);
  });

  it("balance is 0 with no entries", async () => {
    expect(await getTreasuryBalance(ctxA)).toBe(0);
  });
});

describe("treasury write actions", () => {
  beforeEach(async () => { await resetDb(); await testPrisma.treasuryEntry.deleteMany({}); await seedTwoTenants(); });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("OFFICER creates an entry", async () => {
    const m = await mkMember(TENANT_A.id, "off");
    const r = await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "INCOME", category: "DONATION", amount: 500, description: "gift" });
    expect(r.ok).toBe(true);
    const rows = await testPrisma.treasuryEntry.findMany({ where: { tenantId: TENANT_A.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(500);
  });

  it("ENLISTED/NCO cannot create an entry", async () => {
    const m = await mkMember(TENANT_A.id, "grunt");
    const r = await createTreasuryEntryCore(TENANT_A.id, m.id, "NCO", { type: "INCOME", category: "DONATION", amount: 500, description: "x" });
    expect(r.ok).toBe(false);
  });

  it("rejects non-positive or non-integer amounts", async () => {
    const m = await mkMember(TENANT_A.id, "off");
    expect((await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "INCOME", category: "MINING", amount: 0, description: "x" })).ok).toBe(false);
    expect((await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "INCOME", category: "MINING", amount: -5, description: "x" })).ok).toBe(false);
    expect((await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "INCOME", category: "MINING", amount: 1.5, description: "x" })).ok).toBe(false);
  });

  it("rejects an invalid category/type", async () => {
    const m = await mkMember(TENANT_A.id, "off");
    expect((await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "GIFT" as never, category: "MINING", amount: 5, description: "x" })).ok).toBe(false);
    expect((await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "INCOME", category: "ROBBERY" as never, amount: 5, description: "x" })).ok).toBe(false);
  });

  it("COMMAND deletes an entry and writes an audit row", async () => {
    const m = await mkMember(TENANT_A.id, "off");
    const created = await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "EXPENSE", category: "PAYOUT", amount: 100, description: "d" });
    if (!created.ok) throw new Error();
    const cmdAcc = await testPrisma.account.create({ data: { email: `cmd-${Math.random().toString(36).slice(2,6)}@it.example` } });
    const r = await deleteTreasuryEntryCore(TENANT_A.id, cmdAcc.id, "COMMAND", created.entryId);
    expect(r.ok).toBe(true);
    expect(await testPrisma.treasuryEntry.count({ where: { tenantId: TENANT_A.id } })).toBe(0);
    const audit = await testPrisma.auditLog.findFirst({ where: { tenantId: TENANT_A.id, action: "treasury.entry.delete" } });
    expect(audit).not.toBeNull();
  });

  it("OFFICER cannot delete (COMMAND only)", async () => {
    const m = await mkMember(TENANT_A.id, "off");
    const created = await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "INCOME", category: "MINING", amount: 10, description: "d" });
    if (!created.ok) throw new Error();
    const r = await deleteTreasuryEntryCore(TENANT_A.id, m.accountId, "OFFICER", created.entryId);
    expect(r.ok).toBe(false);
    expect(await testPrisma.treasuryEntry.count({ where: { tenantId: TENANT_A.id } })).toBe(1);
  });

  it("cannot delete an entry in another tenant", async () => {
    const mB = await mkMember(TENANT_B.id, "tb");
    const e = await entry(TENANT_B.id, mB.id, "INCOME", "DONATION", 50);
    const cmdAcc = await testPrisma.account.create({ data: { email: `cmd2-${Math.random().toString(36).slice(2,6)}@it.example` } });
    const r = await deleteTreasuryEntryCore(TENANT_A.id, cmdAcc.id, "COMMAND", e.id);
    expect(r.ok).toBe(false);
    expect(await testPrisma.treasuryEntry.count({ where: { tenantId: TENANT_B.id } })).toBe(1);
  });
});
