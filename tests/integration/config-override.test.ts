import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { resolveTenantConfig, getTenantDbOverrides } from "@/lib/config";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A } from "./setup";

describe("config override resolution", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.tenantConfigOverride.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("DB override beats plan + platform defaults", async () => {
    await testPrisma.tenantConfigOverride.upsert({
      where: { tenantId: TENANT_A.id },
      update: { json: { branding: { name: "Alpha Override" } } },
      create: { tenantId: TENANT_A.id, json: { branding: { name: "Alpha Override" } } },
    });
    const overrides = await getTenantDbOverrides(TENANT_A.id);
    const cfg = await resolveTenantConfig("FREE", overrides);
    expect(cfg.branding.name).toBe("Alpha Override");
    expect(cfg.features.forums).toBe(true); // defaults still flow through
  });

  it("missing override row = pure defaults", async () => {
    const overrides = await getTenantDbOverrides(TENANT_A.id);
    const cfg = await resolveTenantConfig("FREE", overrides);
    expect(cfg.branding.name).toBe("or9.space tenant");
  });
});
