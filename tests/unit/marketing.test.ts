import { describe, it, expect } from "vitest";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { MARKETING_FEATURES, buildPlanMatrix } from "@/lib/marketing/features";

describe("marketing content", () => {
  it("plan matrix has one row per feature flag", () => {
    expect(buildPlanMatrix()).toHaveLength(FEATURE_FLAGS.length);
  });
  it("forums is free, fleet is paid-default", () => {
    const m = buildPlanMatrix();
    expect(m.find((r) => r.key === "forums")?.free).toBe(true);
    const fleet = m.find((r) => r.key === "fleet");
    expect(fleet?.free).toBe(false);
    expect(fleet?.paid).toBe(true);
  });
  it("self-hosted mirrors paid feature availability (open-core)", () => {
    for (const r of buildPlanMatrix()) expect(r.selfHosted).toBe(r.paid);
  });
  it("new community + paid features surface in the matrix", () => {
    const keys = buildPlanMatrix().map((r) => r.key);
    expect(keys).toContain("recruitment");
    expect(keys).toContain("messages");
    expect(keys).toContain("scTools");
  });
  it("every marketing feature has a name and blurb", () => {
    expect(MARKETING_FEATURES.length).toBeGreaterThan(0);
    for (const f of MARKETING_FEATURES) {
      expect(f.name).toBeTruthy();
      expect(f.blurb).toBeTruthy();
    }
  });
});
