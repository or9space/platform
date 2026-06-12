import { describe, it, expect } from "vitest";
import { classifyHost } from "@/lib/host-classifier";

describe("classifyHost", () => {
  it("classifies tenant subdomains", () => {
    expect(classifyHost("demo.or9.space")).toEqual({ kind: "tenant", slug: "demo" });
    expect(classifyHost("freedomguards.or9.space:443")).toEqual({ kind: "tenant", slug: "freedomguards" });
  });

  it("classifies marketing root + www", () => {
    expect(classifyHost("or9.space")).toEqual({ kind: "marketing" });
    expect(classifyHost("www.or9.space")).toEqual({ kind: "marketing" });
  });

  it("classifies admin + support subdomains", () => {
    expect(classifyHost("admin.or9.space")).toEqual({ kind: "admin" });
    expect(classifyHost("support.or9.space")).toEqual({ kind: "support" });
  });

  it("classifies api as marketing (reserved, unrouted)", () => {
    expect(classifyHost("api.or9.space")).toEqual({ kind: "marketing" });
  });

  it("handles localhost dev", () => {
    expect(classifyHost("demo.localhost:3000")).toEqual({ kind: "tenant", slug: "demo" });
    expect(classifyHost("admin.localhost:3000")).toEqual({ kind: "admin" });
    expect(classifyHost("localhost:3000")).toEqual({ kind: "marketing" });
  });

  it("null/garbage hosts are marketing", () => {
    expect(classifyHost(null)).toEqual({ kind: "marketing" });
    expect(classifyHost("evil.example.com")).toEqual({ kind: "marketing" });
  });
});
