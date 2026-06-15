import { describe, it, expect } from "vitest";
import { FEATURE_FLAGS, isValidFlagKey } from "@/lib/feature-flags";

describe("feature flag registry", () => {
  it("declares all v1 flags", () => {
    expect(FEATURE_FLAGS).toHaveLength(16);
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
