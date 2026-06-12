import { describe, it, expect } from "vitest";
import { tenantSlugFromHost } from "@/lib/tenant-resolver";

describe("tenantSlugFromHost", () => {
  it("extracts slug from <slug>.or9.space", () => {
    expect(tenantSlugFromHost("freedomguards.or9.space")).toBe("freedomguards");
    expect(tenantSlugFromHost("demo.or9.space")).toBe("demo");
  });

  it("returns null for root or9.space", () => {
    expect(tenantSlugFromHost("or9.space")).toBeNull();
    expect(tenantSlugFromHost("www.or9.space")).toBeNull();
  });

  it("returns null for reserved subdomains", () => {
    expect(tenantSlugFromHost("admin.or9.space")).toBeNull();
    expect(tenantSlugFromHost("support.or9.space")).toBeNull();
    expect(tenantSlugFromHost("api.or9.space")).toBeNull();
  });

  it("ignores port", () => {
    expect(tenantSlugFromHost("demo.or9.space:3000")).toBe("demo");
  });

  it("handles localhost dev with subdomain pattern", () => {
    expect(tenantSlugFromHost("demo.localhost:3000")).toBe("demo");
  });
});
