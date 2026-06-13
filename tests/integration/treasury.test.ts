import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listTreasuryEntries, getTreasuryBalance, getTreasurySummary } from "@/lib/queries/treasury";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

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
