import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listItems, getItem, listHoldings, listHoldingsByItem } from "@/lib/queries/inventory";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = makeTenantContext(TENANT_A.id);

async function mkMembership(tenantId: string, username: string) {
  const acc = await testPrisma.account.create({ data: { email: `${username}-${Math.random().toString(36).slice(2, 6)}@it.example` } });
  return testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username, displayName: username.toUpperCase(), tier: "OFFICER" } });
}
async function mkItem(tenantId: string, name: string, category = "WEAPON", kind = "UNIQUE") {
  return testPrisma.inventoryItem.create({ data: { tenantId, name, category: category as never, kind: kind as never } });
}
async function mkHolding(tenantId: string, itemId: string, quantity: number, custodianMembershipId?: string, state = "ACTIVE") {
  return testPrisma.inventoryHolding.create({ data: { tenantId, itemId, quantity, custodianMembershipId, state: state as never } });
}

describe("inventory queries", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.inventoryHolding.deleteMany({});
    await testPrisma.inventoryItem.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("listItems returns this tenant's items ordered by name, scoped", async () => {
    await mkItem(TENANT_A.id, "Ballista");
    await mkItem(TENANT_A.id, "Arclight");
    await mkItem(TENANT_B.id, "BRAVO_GUN");
    const rows = await listItems(ctxA);
    expect(rows.map((r) => r.name)).toEqual(["Arclight", "Ballista"]);
    expect(rows.some((r) => r.name === "BRAVO_GUN")).toBe(false);
  });

  it("listItems search filters by name", async () => {
    await mkItem(TENANT_A.id, "Ballista");
    await mkItem(TENANT_A.id, "Arclight");
    const rows = await listItems(ctxA, "arc");
    expect(rows.map((r) => r.name)).toEqual(["Arclight"]);
  });

  it("getItem returns the item; null for another tenant's item", async () => {
    const a = await mkItem(TENANT_A.id, "Ballista");
    expect((await getItem(ctxA, a.id))?.name).toBe("Ballista");
    const b = await mkItem(TENANT_B.id, "BRAVO");
    expect(await getItem(ctxA, b.id)).toBeNull();
  });

  it("listHoldings joins item name + custodian name, tenant-scoped", async () => {
    const m = await mkMembership(TENANT_A.id, "holder");
    const item = await mkItem(TENANT_A.id, "Ballista");
    await mkHolding(TENANT_A.id, item.id, 3, m.id);
    const bItem = await mkItem(TENANT_B.id, "BRAVO");
    await mkHolding(TENANT_B.id, bItem.id, 9);
    const rows = await listHoldings(ctxA);
    expect(rows).toHaveLength(1);
    expect(rows[0].itemName).toBe("Ballista");
    expect(rows[0].quantity).toBe(3);
    expect(rows[0].custodianName).toBe("HOLDER");
  });

  it("listHoldings filters by state", async () => {
    const item = await mkItem(TENANT_A.id, "Ballista");
    await mkHolding(TENANT_A.id, item.id, 1, undefined, "ACTIVE");
    await mkHolding(TENANT_A.id, item.id, 1, undefined, "LOST");
    const active = await listHoldings(ctxA, { state: "ACTIVE" });
    expect(active).toHaveLength(1);
    expect(active[0].state).toBe("ACTIVE");
  });

  it("listHoldingsByItem returns only that item's holdings", async () => {
    const i1 = await mkItem(TENANT_A.id, "A");
    const i2 = await mkItem(TENANT_A.id, "B");
    await mkHolding(TENANT_A.id, i1.id, 2);
    await mkHolding(TENANT_A.id, i2.id, 5);
    const rows = await listHoldingsByItem(ctxA, i1.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(2);
  });
});
