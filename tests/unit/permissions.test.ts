import { describe, it, expect } from "vitest";
import { tierRank, hasTier } from "@/lib/permissions";

describe("tier helpers", () => {
  it("ranks tiers in the correct order", () => {
    expect(tierRank("ENLISTED")).toBe(0);
    expect(tierRank("NCO")).toBe(1);
    expect(tierRank("OFFICER")).toBe(2);
    expect(tierRank("COMMAND")).toBe(3);
  });

  it("hasTier returns true when actor meets or exceeds required", () => {
    expect(hasTier("OFFICER", "NCO")).toBe(true);
    expect(hasTier("COMMAND", "OFFICER")).toBe(true);
    expect(hasTier("ENLISTED", "ENLISTED")).toBe(true);
  });

  it("hasTier returns false when actor is below required", () => {
    expect(hasTier("ENLISTED", "OFFICER")).toBe(false);
    expect(hasTier("NCO", "COMMAND")).toBe(false);
  });

  it("hasTier handles null actor tier", () => {
    expect(hasTier(null, "ENLISTED")).toBe(false);
  });
});
