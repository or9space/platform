import { describe, it, expect } from "vitest";
import { isFlagAllowedForPlan, isConfigPathAllowedForPlan, PaywallError } from "@/lib/paywall";

describe("paywall", () => {
  it("free tier cannot enable discord.bot", () => {
    expect(isFlagAllowedForPlan("FREE", "discord.bot")).toBe(false);
    expect(isFlagAllowedForPlan("PAID", "discord.bot")).toBe(true);
  });
  it("free tier cannot enable paid-only ops features; paid can", () => {
    for (const k of ["fleet", "tournaments", "loot", "treasury", "operations", "inventory", "resources", "lfg", "alliances"] as const) {
      expect(isFlagAllowedForPlan("FREE", k)).toBe(false);
      expect(isFlagAllowedForPlan("PAID", k)).toBe(true);
    }
  });
  it("free tier can still toggle the community-tier flags", () => {
    for (const k of ["forums", "events", "news", "handbook"] as const) {
      expect(isFlagAllowedForPlan("FREE", k)).toBe(true);
    }
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
