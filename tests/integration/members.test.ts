import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listMembers, getMemberByUsername, countCommandMemberships } from "@/lib/queries/members";
import { updateOwnProfileCore, setMemberTierCore } from "@/lib/actions/members-core";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = makeTenantContext(TENANT_A.id);

async function mk(tenantId: string, username: string, tier: string, displayName?: string) {
  const acc = await testPrisma.account.create({ data: { email: `${username}-${Math.random().toString(36).slice(2, 6)}@it.example` } });
  return testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username, displayName, tier: tier as never } });
}

describe("member queries", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("listMembers returns only this tenant's members, ordered by tier desc then username", async () => {
    await mk(TENANT_A.id, "alpha", "ENLISTED", "Alpha");
    await mk(TENANT_A.id, "boss", "COMMAND", "Boss");
    await mk(TENANT_B.id, "bravo", "OFFICER", "BRAVO LEAK");
    const rows = await listMembers(ctxA);
    expect(rows.map((m) => m.username)).toEqual(["boss", "alpha"]);
    expect(rows.some((m) => m.username === "bravo")).toBe(false);
  });

  it("listMembers search filters by username/displayName (tenant-scoped)", async () => {
    await mk(TENANT_A.id, "needle", "ENLISTED", "Findme");
    await mk(TENANT_A.id, "haystack", "ENLISTED", "Other");
    const rows = await listMembers(ctxA, "find");
    expect(rows.map((m) => m.username)).toEqual(["needle"]);
  });

  it("getMemberByUsername returns the member + counts, tenant-scoped", async () => {
    const m = await mk(TENANT_A.id, "profileguy", "OFFICER", "Profile Guy");
    const got = await getMemberByUsername(ctxA, "profileguy");
    expect(got?.id).toBe(m.id);
    expect(got?.tier).toBe("OFFICER");
    expect(got?.threadCount).toBe(0);
    expect(got?.postCount).toBe(0);
  });

  it("getMemberByUsername returns null for another tenant's member", async () => {
    await mk(TENANT_B.id, "bsecret", "ENLISTED");
    expect(await getMemberByUsername(ctxA, "bsecret")).toBeNull();
  });

  it("countCommandMemberships counts COMMAND in this tenant only", async () => {
    await mk(TENANT_A.id, "c1", "COMMAND");
    await mk(TENANT_A.id, "c2", "COMMAND");
    await mk(TENANT_A.id, "e1", "ENLISTED");
    await mk(TENANT_B.id, "cb", "COMMAND");
    expect(await countCommandMemberships(ctxA)).toBe(2);
  });
});

describe("member self-profile edit", () => {
  beforeEach(async () => { await resetDb(); await seedTwoTenants(); });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("updates own displayName + bio", async () => {
    const m = await mk(TENANT_A.id, "self", "ENLISTED", "Self");
    const r = await updateOwnProfileCore(TENANT_A.id, m.id, { displayName: "New Name", bio: "hi there" });
    expect(r.ok).toBe(true);
    const row = await testPrisma.membership.findUnique({ where: { id: m.id } });
    expect(row?.displayName).toBe("New Name");
    expect(row?.bio).toBe("hi there");
  });

  it("rejects an over-long bio", async () => {
    const m = await mk(TENANT_A.id, "self2", "ENLISTED");
    const r = await updateOwnProfileCore(TENANT_A.id, m.id, { bio: "x".repeat(501) });
    expect(r.ok).toBe(false);
  });

  it("rejects a non-http avatarUrl", async () => {
    const m = await mk(TENANT_A.id, "self3", "ENLISTED");
    const r = await updateOwnProfileCore(TENANT_A.id, m.id, { avatarUrl: "javascript:alert(1)" });
    expect(r.ok).toBe(false);
  });
});

describe("rank management", () => {
  beforeEach(async () => { await resetDb(); await seedTwoTenants(); });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("COMMAND promotes ENLISTED -> OFFICER and writes an audit row", async () => {
    const boss = await mk(TENANT_A.id, "boss", "COMMAND");
    const grunt = await mk(TENANT_A.id, "grunt", "ENLISTED");
    const r = await setMemberTierCore(TENANT_A.id, boss.accountId, "COMMAND", grunt.id, "OFFICER");
    expect(r.ok).toBe(true);
    const row = await testPrisma.membership.findUnique({ where: { id: grunt.id } });
    expect(row?.tier).toBe("OFFICER");
    const audit = await testPrisma.auditLog.findFirst({ where: { tenantId: TENANT_A.id, action: "member.tier.change" } });
    expect(audit).not.toBeNull();
    expect((audit?.detail as any).to).toBe("OFFICER");
  });

  it("OFFICER cannot change tiers", async () => {
    const off = await mk(TENANT_A.id, "off", "OFFICER");
    const grunt = await mk(TENANT_A.id, "grunt", "ENLISTED");
    const r = await setMemberTierCore(TENANT_A.id, off.accountId, "OFFICER", grunt.id, "OFFICER");
    expect(r.ok).toBe(false);
  });

  it("refuses to demote the LAST COMMAND (lockout protection)", async () => {
    const only = await mk(TENANT_A.id, "only", "COMMAND");
    const r = await setMemberTierCore(TENANT_A.id, only.accountId, "COMMAND", only.id, "OFFICER");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/last|only|command/i);
    const row = await testPrisma.membership.findUnique({ where: { id: only.id } });
    expect(row?.tier).toBe("COMMAND");
  });

  it("allows demoting a COMMAND when another COMMAND remains", async () => {
    const a = await mk(TENANT_A.id, "ca", "COMMAND");
    const b = await mk(TENANT_A.id, "cb", "COMMAND");
    const r = await setMemberTierCore(TENANT_A.id, a.accountId, "COMMAND", b.id, "OFFICER");
    expect(r.ok).toBe(true);
  });

  it("cannot change a member in another tenant", async () => {
    const boss = await mk(TENANT_A.id, "boss", "COMMAND");
    const victim = await mk(TENANT_B.id, "victim", "ENLISTED");
    const r = await setMemberTierCore(TENANT_A.id, boss.accountId, "COMMAND", victim.id, "COMMAND");
    expect(r.ok).toBe(false);
  });

  it("rejects an invalid tier value", async () => {
    const boss = await mk(TENANT_A.id, "boss", "COMMAND");
    const grunt = await mk(TENANT_A.id, "grunt", "ENLISTED");
    const r = await setMemberTierCore(TENANT_A.id, boss.accountId, "COMMAND", grunt.id, "KING" as never);
    expect(r.ok).toBe(false);
  });
});
