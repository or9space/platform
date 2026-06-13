import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listTournaments, getTournamentWithEntries } from "@/lib/queries/tournaments";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = makeTenantContext(TENANT_A.id);

async function mkTournament(tenantId: string, name: string, status = "OPEN") {
  return testPrisma.tournament.create({ data: { tenantId, name, status: status as never, createdByMembershipId: "seed" } });
}
async function mkEntry(tenantId: string, tournamentId: string, displayName: string, opts: { seed?: number; placement?: number } = {}) {
  return testPrisma.tournamentEntry.create({ data: { tenantId, tournamentId, displayName, seed: opts.seed, placement: opts.placement } });
}

describe("tournament queries", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.tournamentEntry.deleteMany({});
    await testPrisma.tournament.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("listTournaments returns this tenant's tournaments with entryCount, scoped", async () => {
    const t = await mkTournament(TENANT_A.id, "Cup");
    await mkEntry(TENANT_A.id, t.id, "Alice");
    await mkEntry(TENANT_A.id, t.id, "Bob");
    await mkTournament(TENANT_B.id, "BRAVO");
    const rows = await listTournaments(ctxA);
    expect(rows.map((r) => r.name)).toEqual(["Cup"]);
    expect(rows[0].entryCount).toBe(2);
  });

  it("getTournamentWithEntries orders entries: placement (nulls last), then seed, then name", async () => {
    const t = await mkTournament(TENANT_A.id, "Cup");
    await mkEntry(TENANT_A.id, t.id, "NoPlace2", { seed: 2 });
    await mkEntry(TENANT_A.id, t.id, "NoPlace1", { seed: 1 });
    await mkEntry(TENANT_A.id, t.id, "Winner", { placement: 1 });
    await mkEntry(TENANT_A.id, t.id, "Runner", { placement: 2 });
    const got = await getTournamentWithEntries(ctxA, t.id);
    expect(got?.entries.map((e) => e.displayName)).toEqual(["Winner", "Runner", "NoPlace1", "NoPlace2"]);
  });

  it("getTournamentWithEntries returns null for another tenant's tournament", async () => {
    const b = await mkTournament(TENANT_B.id, "BRAVO");
    expect(await getTournamentWithEntries(ctxA, b.id)).toBeNull();
  });

  it("entries carry participant name when linked", async () => {
    const acc = await testPrisma.account.create({ data: { email: `p-${Math.random().toString(36).slice(2,6)}@it.example` } });
    const m = await testPrisma.membership.create({ data: { accountId: acc.id, tenantId: TENANT_A.id, username: "pilot", displayName: "PILOT", tier: "ENLISTED" } });
    const t = await mkTournament(TENANT_A.id, "Cup");
    await testPrisma.tournamentEntry.create({ data: { tenantId: TENANT_A.id, tournamentId: t.id, participantMembershipId: m.id, displayName: "PILOT" } });
    const got = await getTournamentWithEntries(ctxA, t.id);
    expect(got?.entries[0].participantMembershipId).toBe(m.id);
  });

  it("empty tournament returns empty entries", async () => {
    const t = await mkTournament(TENANT_A.id, "Empty");
    const got = await getTournamentWithEntries(ctxA, t.id);
    expect(got?.entries).toHaveLength(0);
  });
});
