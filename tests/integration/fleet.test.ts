import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listOrgFleet, getMemberFleet, fleetStats } from "@/lib/queries/fleet";
import { addShipCore, updateShipCore, deleteShipCore } from "@/lib/actions/fleet-core";
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

describe("fleet write actions", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.fleetShip.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("addShip stamps owner = actor", async () => {
    const me = await mkMembership(TENANT_A.id, "me");
    const r = await addShipCore(TENANT_A.id, me.id, { shipName: "Aurora", manufacturer: "RSI", quantity: 1, isPublic: true });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    const ship = await testPrisma.fleetShip.findUnique({ where: { id: r.shipId } });
    expect(ship?.ownerMembershipId).toBe(me.id);
  });

  it("addShip rejects a non-positive quantity and a javascript: imageUrl", async () => {
    const me = await mkMembership(TENANT_A.id, "me");
    expect((await addShipCore(TENANT_A.id, me.id, { shipName: "X", quantity: 0 })).ok).toBe(false);
    expect((await addShipCore(TENANT_A.id, me.id, { shipName: "X", imageUrl: "javascript:alert(1)" })).ok).toBe(false);
    expect((await addShipCore(TENANT_A.id, me.id, { shipName: "X", imageUrl: "https://ex.com/a.png" })).ok).toBe(true);
  });

  it("updateShip: owner can update own; a different member cannot", async () => {
    const me = await mkMembership(TENANT_A.id, "me");
    const other = await mkMembership(TENANT_A.id, "other");
    const s = await mkShip(TENANT_A.id, me.id, "Aurora");
    const ok = await updateShipCore(TENANT_A.id, me.id, s.id, { shipName: "Aurora LX", quantity: 2 });
    expect(ok.ok).toBe(true);
    const bad = await updateShipCore(TENANT_A.id, other.id, s.id, { shipName: "Hijack" });
    expect(bad.ok).toBe(false);
    const row = await testPrisma.fleetShip.findUnique({ where: { id: s.id } });
    expect(row?.shipName).toBe("Aurora LX");  // unchanged by the hijack
  });

  it("deleteShip: owner deletes own; non-owner non-COMMAND rejected; COMMAND deletes any + audit", async () => {
    const me = await mkMembership(TENANT_A.id, "me");
    const other = await mkMembership(TENANT_A.id, "other");
    const s1 = await mkShip(TENANT_A.id, me.id, "Own");
    const okOwn = await deleteShipCore(TENANT_A.id, me.id, "acc-me", "ENLISTED", s1.id);
    expect(okOwn.ok).toBe(true);
    const s2 = await mkShip(TENANT_A.id, me.id, "Theirs");
    const denied = await deleteShipCore(TENANT_A.id, other.id, "acc-other", "OFFICER", s2.id);
    expect(denied.ok).toBe(false);  // OFFICER is not owner and not COMMAND
    const cmd = await mkMembership(TENANT_A.id, "cmd");
    const modDel = await deleteShipCore(TENANT_A.id, cmd.id, "acc-cmd", "COMMAND", s2.id);
    expect(modDel.ok).toBe(true);
    const audit = await testPrisma.auditLog.findFirst({ where: { tenantId: TENANT_A.id, action: "fleet.ship.moderate_delete" } });
    expect(audit).not.toBeNull();
  });

  it("cannot update/delete a ship in another tenant", async () => {
    const me = await mkMembership(TENANT_A.id, "me");
    const bm = await mkMembership(TENANT_B.id, "bguy");
    const bShip = await mkShip(TENANT_B.id, bm.id, "BRAVO");
    expect((await updateShipCore(TENANT_A.id, me.id, bShip.id, { shipName: "x" })).ok).toBe(false);
    expect((await deleteShipCore(TENANT_A.id, me.id, "acc-me", "COMMAND", bShip.id)).ok).toBe(false);
  });
});
