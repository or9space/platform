import { describe, it, expect } from "vitest";
import { ConfigSchema, resolveConfigFromValues } from "@/lib/config/schema";
import { loadPlatformDefaults, loadPlanDefaults } from "@/lib/config";

describe("config schema", () => {
  it("parses a minimal valid config", () => {
    const result = ConfigSchema.safeParse({
      branding: { name: "Test", preset: "tactical-dark" },
      labels: {},
      features: {
        forums: true, handbook: true, loot: true, inventory: true, treasury: true,
        fleet: false, tournaments: false,
        "calendar.googleIntegration": true, "discord.bot": false, ads: true,
      },
      integrations: {},
      customFields: {},
      domains: { customDomain: null, customDomainStatus: null },
      ads: { slots: ["sidebar-bottom"], fallbackHouseAd: true },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown feature flag", () => {
    const result = ConfigSchema.safeParse({
      branding: { name: "Test", preset: "tactical-dark" },
      labels: {},
      features: { madeUpFlag: true },
      integrations: {},
      customFields: {},
      domains: { customDomain: null, customDomainStatus: null },
      ads: { slots: [], fallbackHouseAd: true },
    });
    expect(result.success).toBe(false);
  });
});

describe("config resolution", () => {
  it("loads platform defaults yaml", async () => {
    const d = await loadPlatformDefaults();
    expect(d.branding.name).toBeDefined();
    expect(d.features).toBeDefined();
  });

  it("loads free plan yaml", async () => {
    const d = await loadPlanDefaults("FREE");
    expect(d).toBeDefined();
  });

  it("merges layers with deepest winning", () => {
    const platform = { branding: { name: "Platform", preset: "tactical-dark" } };
    const plan = { features: { fleet: false } };
    const tenant = { branding: { name: "Tenant Override" } };
    const merged = resolveConfigFromValues(platform, plan, tenant);
    expect(merged.branding?.name).toBe("Tenant Override");
    expect(merged.features?.fleet).toBe(false);
  });
});
