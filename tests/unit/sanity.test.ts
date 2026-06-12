import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("can do math", () => {
    expect(2 + 2).toBe(4);
  });

  it("can import from @", async () => {
    const mod = await import("@/app/page");
    expect(typeof mod.default).toBe("function");
  });
});
