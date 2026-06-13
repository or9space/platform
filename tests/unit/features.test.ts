import { describe, it, expect } from "vitest";
import { featureDefaultsForPlan } from "@/lib/config/apply-defaults";
import { resolveTenantFeatures, isFeatureEnabled } from "@/lib/features";

describe("feature defaults by plan", () => {
  it("free tier: fleet/tournaments/discord off, forums on, ads on", () => {
    const f = featureDefaultsForPlan("FREE");
    expect(f.forums).toBe(true);
    expect(f.fleet).toBe(false);
    expect(f.tournaments).toBe(false);
    expect(f["discord.bot"]).toBe(false);
    expect(f.ads).toBe(true);
  });
  it("paid tier: fleet/tournaments/discord on, ads off", () => {
    const f = featureDefaultsForPlan("PAID");
    expect(f.fleet).toBe(true);
    expect(f.tournaments).toBe(true);
    expect(f["discord.bot"]).toBe(true);
    expect(f.ads).toBe(false);
  });
});

describe("resolveTenantFeatures", () => {
  it("applies DB overrides on top of plan defaults", () => {
    const f = resolveTenantFeatures("FREE", [{ key: "fleet", enabled: true }]);
    expect(f.fleet).toBe(true);
    expect(f.forums).toBe(true);
  });
  it("ignores unknown override keys", () => {
    const f = resolveTenantFeatures("FREE", [{ key: "not-a-flag", enabled: true }]);
    expect((f as Record<string, boolean>)["not-a-flag"]).toBeUndefined();
  });
  it("ads is platform-controlled: a tenant override cannot turn ads off", () => {
    const f = resolveTenantFeatures("FREE", [{ key: "ads", enabled: false }]);
    expect(f.ads).toBe(true);
  });
  it("isFeatureEnabled reads the resolved map", () => {
    const f = resolveTenantFeatures("PAID", []);
    expect(isFeatureEnabled(f, "fleet")).toBe(true);
  });
});
