import { describe, it, expect } from "vitest";
import { isFlagAllowedForPlan, isConfigPathAllowedForPlan, PaywallError } from "@/lib/paywall";

describe("paywall", () => {
  it("free tier cannot enable discord.bot", () => {
    expect(isFlagAllowedForPlan("FREE", "discord.bot")).toBe(false);
    expect(isFlagAllowedForPlan("PAID", "discord.bot")).toBe(true);
  });
  it("free tier CAN enable fleet/tournaments (off by default but not paid-locked)", () => {
    expect(isFlagAllowedForPlan("FREE", "fleet")).toBe(true);
    expect(isFlagAllowedForPlan("FREE", "tournaments")).toBe(true);
  });
  it("free tier cannot set a custom domain; paid can", () => {
    expect(isConfigPathAllowedForPlan("FREE", "domains.customDomain")).toBe(false);
    expect(isConfigPathAllowedForPlan("PAID", "domains.customDomain")).toBe(true);
  });
  it("non-paywalled config paths are allowed on free", () => {
    expect(isConfigPathAllowedForPlan("FREE", "branding.name")).toBe(true);
  });
  it("PaywallError is an Error subclass", () => {
    expect(new PaywallError("x")).toBeInstanceOf(Error);
  });
});
