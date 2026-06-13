import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listTournaments, getTournamentWithEntries } from "@/lib/queries/tournaments";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";
import {
  createTournamentCore, setTournamentStatusCore, deleteTournamentCore,
  addEntryCore, removeEntryCore, recordPlacementCore,
} from "@/lib/actions/tournaments-core";

async function membership(tenantId: string, username: string, tier: string) {
  const acc = await testPrisma.account.create({ data: { email: `${username}-${Math.random().toString(36).slice(2,6)}@it.example` } });
  return testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username, displayName: username.toUpperCase(), tier: tier as never } });
}

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

describe("tournament write actions", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.tournamentEntry.deleteMany({});
    await testPrisma.tournament.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("OFFICER creates a tournament; ENLISTED cannot", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const grunt = await membership(TENANT_A.id, "grunt", "ENLISTED");
    expect((await createTournamentCore(TENANT_A.id, grunt.id, "ENLISTED", { name: "Cup" })).ok).toBe(false);
    const ok = await createTournamentCore(TENANT_A.id, off.id, "OFFICER", { name: "Cup" });
    expect(ok.ok).toBe(true);
  });

  it("setStatus OFFICER+ moves DRAFT->OPEN", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const t = await createTournamentCore(TENANT_A.id, off.id, "OFFICER", { name: "Cup" });
    if (!t.ok) throw new Error();
    const r = await setTournamentStatusCore(TENANT_A.id, off.id, "OFFICER", t.tournamentId, "OPEN");
    expect(r.ok).toBe(true);
    const row = await testPrisma.tournament.findUnique({ where: { id: t.tournamentId } });
    expect(row?.status).toBe("OPEN");
  });

  it("member self-registers only when OPEN; double-register rejected", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const player = await membership(TENANT_A.id, "player", "ENLISTED");
    const t = await createTournamentCore(TENANT_A.id, off.id, "OFFICER", { name: "Cup" });
    if (!t.ok) throw new Error();
    // DRAFT -> self-register rejected
    expect((await addEntryCore(TENANT_A.id, player.id, "ENLISTED", { tournamentId: t.tournamentId, displayName: "PLAYER" })).ok).toBe(false);
    await setTournamentStatusCore(TENANT_A.id, off.id, "OFFICER", t.tournamentId, "OPEN");
    const reg = await addEntryCore(TENANT_A.id, player.id, "ENLISTED", { tournamentId: t.tournamentId, displayName: "PLAYER" });
    expect(reg.ok).toBe(true);
    const entry = await testPrisma.tournamentEntry.findFirst({ where: { tournamentId: t.tournamentId } });
    expect(entry?.participantMembershipId).toBe(player.id);
    // double-register rejected
    expect((await addEntryCore(TENANT_A.id, player.id, "ENLISTED", { tournamentId: t.tournamentId, displayName: "PLAYER" })).ok).toBe(false);
  });

  it("OFFICER adds an off-roster entry regardless of status (asOfficer)", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const t = await createTournamentCore(TENANT_A.id, off.id, "OFFICER", { name: "Cup" });  // DRAFT
    if (!t.ok) throw new Error();
    const r = await addEntryCore(TENANT_A.id, off.id, "OFFICER", { tournamentId: t.tournamentId, displayName: "Guest Team", asOfficer: true });
    expect(r.ok).toBe(true);
    // ENLISTED cannot use asOfficer
    const grunt = await membership(TENANT_A.id, "grunt", "ENLISTED");
    expect((await addEntryCore(TENANT_A.id, grunt.id, "ENLISTED", { tournamentId: t.tournamentId, displayName: "Sneak", asOfficer: true })).ok).toBe(false);
  });

  it("removeEntry: owner removes own; OFFICER removes any; stranger cannot", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const player = await membership(TENANT_A.id, "player", "ENLISTED");
    const stranger = await membership(TENANT_A.id, "stranger", "ENLISTED");
    const t = await createTournamentCore(TENANT_A.id, off.id, "OFFICER", { name: "Cup" });
    if (!t.ok) throw new Error();
    await setTournamentStatusCore(TENANT_A.id, off.id, "OFFICER", t.tournamentId, "OPEN");
    const reg = await addEntryCore(TENANT_A.id, player.id, "ENLISTED", { tournamentId: t.tournamentId, displayName: "PLAYER" });
    if (!reg.ok) throw new Error();
    expect((await removeEntryCore(TENANT_A.id, stranger.id, "ENLISTED", reg.entryId)).ok).toBe(false);
    expect((await removeEntryCore(TENANT_A.id, player.id, "ENLISTED", reg.entryId)).ok).toBe(true);
  });

  it("recordPlacement OFFICER+ sets placement", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const t = await createTournamentCore(TENANT_A.id, off.id, "OFFICER", { name: "Cup" });
    if (!t.ok) throw new Error();
    const e = await addEntryCore(TENANT_A.id, off.id, "OFFICER", { tournamentId: t.tournamentId, displayName: "Team", asOfficer: true });
    if (!e.ok) throw new Error();
    const r = await recordPlacementCore(TENANT_A.id, off.id, "OFFICER", e.entryId, 1);
    expect(r.ok).toBe(true);
    const row = await testPrisma.tournamentEntry.findUnique({ where: { id: e.entryId } });
    expect(row?.placement).toBe(1);
  });

  it("delete requires COMMAND + audit", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const t = await createTournamentCore(TENANT_A.id, off.id, "OFFICER", { name: "Cup" });
    if (!t.ok) throw new Error();
    expect((await deleteTournamentCore(TENANT_A.id, off.id, "acc-off", "OFFICER", t.tournamentId)).ok).toBe(false);
    const cmd = await membership(TENANT_A.id, "cmd", "COMMAND");
    const ok = await deleteTournamentCore(TENANT_A.id, cmd.id, cmd.accountId, "COMMAND", t.tournamentId);
    expect(ok.ok).toBe(true);
    const audit = await testPrisma.auditLog.findFirst({ where: { tenantId: TENANT_A.id, action: "tournament.delete" } });
    expect(audit).not.toBeNull();
  });

  it("cannot manage a tournament in another tenant", async () => {
    const off = await membership(TENANT_A.id, "off", "OFFICER");
    const bOff = await membership(TENANT_B.id, "boff", "OFFICER");
    const bt = await createTournamentCore(TENANT_B.id, bOff.id, "OFFICER", { name: "BRAVO" });
    if (!bt.ok) throw new Error();
    expect((await setTournamentStatusCore(TENANT_A.id, off.id, "OFFICER", bt.tournamentId, "OPEN")).ok).toBe(false);
  });
});
