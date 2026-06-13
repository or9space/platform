import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listMembers, getMemberByUsername, countCommandMemberships } from "@/lib/queries/members";
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
