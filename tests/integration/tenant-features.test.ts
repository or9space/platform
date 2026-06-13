import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { loadTenantFeatures } from "@/lib/server/get-tenant-features";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A } from "./setup";

describe("loadTenantFeatures", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.tenantFeatureFlag.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("returns plan defaults when no overrides", async () => {
    const f = await loadTenantFeatures({ id: TENANT_A.id, plan: "FREE" });
    expect(f.forums).toBe(true);
    expect(f.fleet).toBe(false);
  });

  it("applies a stored override", async () => {
    await testPrisma.tenantFeatureFlag.create({
      data: { tenantId: TENANT_A.id, key: "fleet", enabled: true },
    });
    const f = await loadTenantFeatures({ id: TENANT_A.id, plan: "FREE" });
    expect(f.fleet).toBe(true);
  });
});
