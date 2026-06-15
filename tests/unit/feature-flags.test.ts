import { describe, it, expect } from "vitest";
import { FEATURE_FLAGS, isValidFlagKey } from "@/lib/feature-flags";
import { featureDefaultsForPlan } from "@/lib/config/apply-defaults";
import { isFlagAllowedForPlan } from "@/lib/paywall";

const FREE_FEATURES = ["forums", "events", "news", "handbook"] as const;
const PAID_FEATURES = ["operations", "loot", "treasury", "inventory", "fleet", "tournaments", "resources", "lfg", "alliances"] as const;

describe("feature flag registry", () => {
  it("declares all v1 flags", () => {
    expect(FEATURE_FLAGS).toHaveLength(16);
  });

  it("free tier gets the community starter, not the paid ops features", () => {
    const free = featureDefaultsForPlan("FREE");
    for (const k of FREE_FEATURES) expect(free[k]).toBe(true);
    for (const k of PAID_FEATURES) expect(free[k]).toBe(false);
  });

  it("paid tier gets every gated feature", () => {
    const paid = featureDefaultsForPlan("PAID");
    for (const k of [...FREE_FEATURES, ...PAID_FEATURES]) expect(paid[k]).toBe(true);
  });

  it("free tenants cannot enable paid-only features; paid can", () => {
    for (const k of PAID_FEATURES) {
      expect(isFlagAllowedForPlan("FREE", k)).toBe(false);
      expect(isFlagAllowedForPlan("PAID", k)).toBe(true);
    }
    for (const k of FREE_FEATURES) expect(isFlagAllowedForPlan("FREE", k)).toBe(true);
  });

  it("includes the locked flag keys", () => {
    const keys = FEATURE_FLAGS.map((f) => f.key);
    for (const expected of [
      "forums", "events", "news", "operations", "resources", "lfg", "alliances",
      "handbook", "loot", "inventory", "treasury",
      "fleet", "tournaments", "calendar.googleIntegration",
      "discord.bot", "ads"
    ]) {
      expect(keys).toContain(expected);
    }
  });

  it("ads is platform-controlled (not tenant-editable)", () => {
    const ads = FEATURE_FLAGS.find((f) => f.key === "ads");
    expect(ads?.tenantEditable).toBe(false);
  });

  it("discord.bot requires paid tier", () => {
    const discord = FEATURE_FLAGS.find((f) => f.key === "discord.bot");
    expect(discord?.paidOnly).toBe(true);
  });

  it("isValidFlagKey accepts only declared flags", () => {
    expect(isValidFlagKey("forums")).toBe(true);
    expect(isValidFlagKey("not-a-flag")).toBe(false);
  });
});
