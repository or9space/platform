import { describe, it, expect } from "vitest";
import { shouldServeHouseAd } from "@/lib/ads";
import { houseAdProvider } from "@/lib/extensions/house-ad-provider";

const cfg = (slots: string[], fallback: boolean) =>
  ({ ads: { slots, fallbackHouseAd: fallback } }) as any;

describe("ads decision", () => {
  it("no ad when ads disabled (paid tenant)", () => {
    expect(
      shouldServeHouseAd({
        adsEnabled: false,
        slot: "sidebar-bottom",
        config: cfg(["sidebar-bottom"], true),
        networkActive: false,
      }),
    ).toBe(false);
  });

  it("no ad when slot not configured", () => {
    expect(
      shouldServeHouseAd({
        adsEnabled: true,
        slot: "below-header",
        config: cfg(["sidebar-bottom"], true),
        networkActive: false,
      }),
    ).toBe(false);
  });

  it("house ad when ads on, slot configured, no network, fallback on", () => {
    expect(
      shouldServeHouseAd({
        adsEnabled: true,
        slot: "sidebar-bottom",
        config: cfg(["sidebar-bottom"], true),
        networkActive: false,
      }),
    ).toBe(true);
  });

  it("no house ad when a network provider is active", () => {
    expect(
      shouldServeHouseAd({
        adsEnabled: true,
        slot: "sidebar-bottom",
        config: cfg(["sidebar-bottom"], true),
        networkActive: true,
      }),
    ).toBe(false);
  });

  it("no house ad when fallback disabled", () => {
    expect(
      shouldServeHouseAd({
        adsEnabled: true,
        slot: "sidebar-bottom",
        config: cfg(["sidebar-bottom"], false),
        networkActive: false,
      }),
    ).toBe(false);
  });

  it("house provider returns static upgrade html", async () => {
    const r = await houseAdProvider.serve("sidebar-bottom", "t1");
    expect(r?.html).toMatch(/Upgrade/i);
  });
});
