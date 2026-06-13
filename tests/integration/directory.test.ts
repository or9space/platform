import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { listPublicOrgs } from "@/lib/queries/directory";
import { setDirectoryListingCore } from "@/lib/actions/directory-core";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

async function commandAccount(tenantId: string) {
  const acc = await testPrisma.account.create({ data: { email: `cmd-${Math.random().toString(36).slice(2,6)}@it-test.example` } });
  await testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username: `cmd${Math.random().toString(36).slice(2,6)}`, tier: "COMMAND" } });
  return acc.id;
}
async function enlistedAccount(tenantId: string) {
  const acc = await testPrisma.account.create({ data: { email: `enl-${Math.random().toString(36).slice(2,6)}@it-test.example` } });
  await testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username: `enl${Math.random().toString(36).slice(2,6)}`, tier: "ENLISTED" } });
  return acc.id;
}

describe("org directory", () => {
  beforeEach(async () => { await resetDb(); await seedTwoTenants(); });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("listPublicOrgs returns only opted-in LIVE orgs with public fields", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    await setDirectoryListingCore(TENANT_A.id, cmd, { isListed: true, tagline: "Alpha crew" });
    const orgs = await listPublicOrgs();
    const slugs = orgs.map((o) => o.slug);
    expect(slugs).toContain(TENANT_A.slug);
    expect(slugs).not.toContain(TENANT_B.slug);
    const a = orgs.find((o) => o.slug === TENANT_A.slug)!;
    expect(a.tagline).toBe("Alpha crew");
    expect(Object.keys(a).sort()).toEqual(["name", "slug", "tagline"]);
  });

  it("COMMAND can toggle listing; ENLISTED cannot", async () => {
    const enl = await enlistedAccount(TENANT_A.id);
    expect((await setDirectoryListingCore(TENANT_A.id, enl, { isListed: true })).ok).toBe(false);
    const cmd = await commandAccount(TENANT_A.id);
    expect((await setDirectoryListingCore(TENANT_A.id, cmd, { isListed: true })).ok).toBe(true);
    const row = await testPrisma.tenant.findUnique({ where: { id: TENANT_A.id } });
    expect(row?.isListed).toBe(true);
  });

  it("un-listing removes it from the directory", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    await setDirectoryListingCore(TENANT_A.id, cmd, { isListed: true });
    await setDirectoryListingCore(TENANT_A.id, cmd, { isListed: false });
    const orgs = await listPublicOrgs();
    expect(orgs.map((o) => o.slug)).not.toContain(TENANT_A.slug);
  });

  it("rejects an over-long tagline", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    expect((await setDirectoryListingCore(TENANT_A.id, cmd, { isListed: true, tagline: "x".repeat(300) })).ok).toBe(false);
  });
});
