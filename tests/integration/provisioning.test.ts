import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { provisionApprovedTenant, hashClaimToken } from "@/lib/provisioning";
import { testPrisma, resetDb, closeDb } from "./setup";

describe("provisionApprovedTenant", () => {
  beforeEach(async () => {
    await resetDb();
    // tenantConfigOverride rows keyed by dynamic cuid don't collide, but clean
    // up orphans left by previous runs so the dev DB stays tidy.
    await testPrisma.tenantConfigOverride.deleteMany({});
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  async function makePending() {
    return testPrisma.pendingTenant.create({
      data: {
        slug: "it-prov", name: "Prov Org",
        requestedEmail: "founder@it-test.example", description: "test",
      },
    });
  }

  it("provisions: tenant LIVE, config row, claim token, pending APPROVED", async () => {
    const pending = await makePending();
    const result = await provisionApprovedTenant(pending.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tenant = await testPrisma.tenant.findUnique({ where: { slug: "it-prov" } });
    expect(tenant?.status).toBe("LIVE");
    expect(tenant?.founderClaimTokenHash).toBe(hashClaimToken(result.claimToken));
    expect(result.claimUrl).toContain("it-prov");
    expect(result.claimUrl).toContain(result.claimToken);

    const cfg = await testPrisma.tenantConfigOverride.findUnique({ where: { tenantId: tenant!.id } });
    expect(cfg).not.toBeNull();

    const decided = await testPrisma.pendingTenant.findUnique({ where: { id: pending.id } });
    expect(decided?.status).toBe("APPROVED");
  });

  it("is idempotent — second call returns existing tenant without duplicating", async () => {
    const pending = await makePending();
    const first = await provisionApprovedTenant(pending.id);
    const second = await provisionApprovedTenant(pending.id);
    expect(first.ok && second.ok).toBe(true);
    const tenants = await testPrisma.tenant.findMany({ where: { slug: "it-prov" } });
    expect(tenants.length).toBe(1);
  });

  it("fails cleanly when slug got taken since approval", async () => {
    const pending = await makePending();
    await testPrisma.tenant.create({ data: { slug: "it-prov", name: "Squatter" } });
    const result = await provisionApprovedTenant(pending.id);
    expect(result.ok).toBe(false);
  });
});
