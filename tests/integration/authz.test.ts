import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getViewerMembership, requireTier } from "@/lib/authz";
import { ForbiddenError } from "@/lib/permissions";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

describe("per-tenant authorization", () => {
  let accountId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTwoTenants();
    const acc = await testPrisma.account.create({ data: { email: "az@it-test.example" } });
    accountId = acc.id;
    await testPrisma.membership.create({
      data: { accountId, tenantId: TENANT_A.id, username: "azuser", tier: "OFFICER" },
    });
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("returns the viewer's membership + tier in the current tenant", async () => {
    const m = await getViewerMembership(TENANT_A.id, accountId);
    expect(m?.tier).toBe("OFFICER");
    expect(m?.username).toBe("azuser");
  });

  it("returns null when the account has no membership in this tenant", async () => {
    const m = await getViewerMembership(TENANT_B.id, accountId);
    expect(m).toBeNull();
  });

  it("requireTier passes when tier is sufficient", async () => {
    const m = await requireTier(TENANT_A.id, accountId, "NCO");
    expect(m.tier).toBe("OFFICER");
  });

  it("requireTier throws ForbiddenError when tier is too low", async () => {
    await expect(requireTier(TENANT_A.id, accountId, "COMMAND")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("requireTier throws when no membership", async () => {
    await expect(requireTier(TENANT_B.id, accountId, "ENLISTED")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("requireTier throws when accountId is null (not signed in)", async () => {
    await expect(requireTier(TENANT_A.id, null, "ENLISTED")).rejects.toBeInstanceOf(ForbiddenError);
  });
});
