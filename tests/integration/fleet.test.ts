import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listOrgFleet, getMemberFleet, fleetStats } from "@/lib/queries/fleet";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = makeTenantContext(TENANT_A.id);

async function mkMembership(tenantId: string, username: string) {
  const acc = await testPrisma.account.create({ data: { email: `${username}-${Math.random().toString(36).slice(2,6)}@it.example` } });
  return testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username, displayName: username.toUpperCase(), tier: "ENLISTED" } });
}
async function mkShip(tenantId: string, ownerId: string, shipName: string, isPublic = true, quantity = 1) {
  return testPrisma.fleetShip.create({ data: { tenantId, ownerMembershipId: ownerId, shipName, isPublic, quantity } });
}

describe("fleet queries", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.fleetShip.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("listOrgFleet returns public ships + the viewer's own private, never others' private", async () => {
    const me = await mkMembership(TENANT_A.id, "me");
    const other = await mkMembership(TENANT_A.id, "other");
    await mkShip(TENANT_A.id, me.id, "MyPublic", true);
    await mkShip(TENANT_A.id, me.id, "MyPrivate", false);
    await mkShip(TENANT_A.id, other.id, "OtherPublic", true);
    await mkShip(TENANT_A.id, other.id, "OtherPrivate", false);
    // tenant B noise
    const bm = await mkMembership(TENANT_B.id, "bguy");
    await mkShip(TENANT_B.id, bm.id, "BRAVO", true);
    const rows = await listOrgFleet(ctxA, me.id);
    const names = rows.map((r) => r.shipName).sort();
    expect(names).toEqual(["MyPrivate", "MyPublic", "OtherPublic"]);  // NOT OtherPrivate, NOT BRAVO
  });

  it("listOrgFleet includes owner name", async () => {
    const me = await mkMembership(TENANT_A.id, "me");
    await mkShip(TENANT_A.id, me.id, "Ship");
    const rows = await listOrgFleet(ctxA, me.id);
    expect(rows[0].ownerName).toBe("ME");
  });

  it("getMemberFleet returns all of one member's ships", async () => {
    const me = await mkMembership(TENANT_A.id, "me");
    await mkShip(TENANT_A.id, me.id, "A", true);
    await mkShip(TENANT_A.id, me.id, "B", false);
    const rows = await getMemberFleet(ctxA, me.id);
    expect(rows).toHaveLength(2);
  });

  it("getMemberFleet null/empty for another tenant's member ships", async () => {
    const bm = await mkMembership(TENANT_B.id, "bguy");
    await mkShip(TENANT_B.id, bm.id, "BRAVO");
    const rows = await getMemberFleet(ctxA, bm.id);
    expect(rows).toHaveLength(0);  // db(ctx) scoped to tenant A
  });

  it("fleetStats totals ships + quantity for the tenant", async () => {
    const me = await mkMembership(TENANT_A.id, "me");
    await mkShip(TENANT_A.id, me.id, "A", true, 2);
    await mkShip(TENANT_A.id, me.id, "B", true, 3);
    const s = await fleetStats(ctxA);
    expect(s.totalShips).toBe(2);
    expect(s.totalQuantity).toBe(5);
  });
});
