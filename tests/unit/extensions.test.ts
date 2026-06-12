import { describe, it, expect, beforeEach } from "vitest";
import { ExtensionRegistry } from "@/lib/extensions/registry";
import { noOpAdProvider } from "@/lib/extensions/ad-provider";

describe("ExtensionRegistry", () => {
  let ext: ExtensionRegistry;
  beforeEach(() => { ext = new ExtensionRegistry(); });

  it("starts with no-op defaults", () => {
    expect(ext.adProvider).toBe(noOpAdProvider);
    expect(ext.billingProvider.kind).toBe("noop");
    expect(ext.domainAttachProvider.kind).toBe("noop");
  });

  it("allows registering a real provider", () => {
    const fake = { kind: "fake" as const, serve: async () => ({ html: "<p>ad</p>" }) };
    ext.register("adProvider", fake as any);
    expect(ext.adProvider).toBe(fake);
  });

  it("isExtended() returns true when any non-default provider is registered", () => {
    expect(ext.isExtended()).toBe(false);
    ext.register("adProvider", { kind: "fake" as any, serve: async () => ({ html: "" }) });
    expect(ext.isExtended()).toBe(true);
  });
});
