import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listItems, getItem, listHoldings, listHoldingsByItem } from "@/lib/queries/inventory";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";
import {
  createItemCore, updateItemCore, deleteItemCore,
  createHoldingCore, updateHoldingCore,
} from "@/lib/actions/inventory-core";

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

describe("inventory write actions", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.inventoryHolding.deleteMany({});
    await testPrisma.inventoryItem.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("OFFICER creates an item; ENLISTED cannot", async () => {
    const denied = await createItemCore(TENANT_A.id, "x", "ENLISTED", { name: "Gun", category: "WEAPON", kind: "UNIQUE" });
    expect(denied.ok).toBe(false);
    const ok = await createItemCore(TENANT_A.id, "x", "OFFICER", { name: "Gun", category: "WEAPON", kind: "UNIQUE" });
    expect(ok.ok).toBe(true);
  });

  it("createItem rejects an invalid category/kind", async () => {
    expect((await createItemCore(TENANT_A.id, "x", "OFFICER", { name: "Gun", category: "LASER" as never, kind: "UNIQUE" })).ok).toBe(false);
    expect((await createItemCore(TENANT_A.id, "x", "OFFICER", { name: "Gun", category: "WEAPON", kind: "INFINITE" as never })).ok).toBe(false);
  });

  it("updateItem changes fields (OFFICER)", async () => {
    const i = await mkItem(TENANT_A.id, "Gun");
    const r = await updateItemCore(TENANT_A.id, "x", "OFFICER", i.id, { name: "Big Gun", category: "ARMOR" });
    expect(r.ok).toBe(true);
    const row = await testPrisma.inventoryItem.findUnique({ where: { id: i.id } });
    expect(row?.name).toBe("Big Gun");
    expect(row?.category).toBe("ARMOR");
  });

  it("deleteItem requires COMMAND + writes audit (cascades holdings)", async () => {
    const i = await mkItem(TENANT_A.id, "Gun");
    await mkHolding(TENANT_A.id, i.id, 2);
    const denied = await deleteItemCore(TENANT_A.id, "x", "acc-x", "OFFICER", i.id);
    expect(denied.ok).toBe(false);
    const ok = await deleteItemCore(TENANT_A.id, "x", "acc-x", "COMMAND", i.id);
    expect(ok.ok).toBe(true);
    expect(await testPrisma.inventoryItem.count({ where: { tenantId: TENANT_A.id } })).toBe(0);
    expect(await testPrisma.inventoryHolding.count({ where: { tenantId: TENANT_A.id } })).toBe(0);
    const audit = await testPrisma.auditLog.findFirst({ where: { tenantId: TENANT_A.id, action: "inventory.item.delete" } });
    expect(audit).not.toBeNull();
  });

  it("createHolding OFFICER+; quantity positive; default ACTIVE", async () => {
    const i = await mkItem(TENANT_A.id, "Gun");
    const bad = await createHoldingCore(TENANT_A.id, "x", "OFFICER", { itemId: i.id, quantity: 0 });
    expect(bad.ok).toBe(false);
    const r = await createHoldingCore(TENANT_A.id, "x", "OFFICER", { itemId: i.id, quantity: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    const h = await testPrisma.inventoryHolding.findUnique({ where: { id: r.holdingId } });
    expect(h?.quantity).toBe(3);
    expect(h?.state).toBe("ACTIVE");
  });

  it("createHolding rejects a custodian from another tenant", async () => {
    const i = await mkItem(TENANT_A.id, "Gun");
    const bMember = await mkMembership(TENANT_B.id, "bguy");
    const r = await createHoldingCore(TENANT_A.id, "x", "OFFICER", { itemId: i.id, quantity: 1, custodianMembershipId: bMember.id });
    expect(r.ok).toBe(false);
  });

  it("createHolding rejects an item from another tenant", async () => {
    const bItem = await mkItem(TENANT_B.id, "BRAVO");
    const r = await createHoldingCore(TENANT_A.id, "x", "OFFICER", { itemId: bItem.id, quantity: 1 });
    expect(r.ok).toBe(false);
  });

  it("updateHolding changes quantity/state (OFFICER)", async () => {
    const i = await mkItem(TENANT_A.id, "Gun");
    const h = await mkHolding(TENANT_A.id, i.id, 1);
    const r = await updateHoldingCore(TENANT_A.id, "x", "OFFICER", h.id, { quantity: 5, state: "LOST" });
    expect(r.ok).toBe(true);
    const row = await testPrisma.inventoryHolding.findUnique({ where: { id: h.id } });
    expect(row?.quantity).toBe(5);
    expect(row?.state).toBe("LOST");
  });

  it("cannot update an item in another tenant", async () => {
    const bItem = await mkItem(TENANT_B.id, "BRAVO");
    const r = await updateItemCore(TENANT_A.id, "x", "OFFICER", bItem.id, { name: "hijack" });
    expect(r.ok).toBe(false);
  });
});
