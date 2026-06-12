import { describe, it, expect, beforeEach } from "vitest";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

describe("isPlatformAdminEmail", () => {
  beforeEach(() => { process.env.PLATFORM_ADMIN_EMAILS = "dsmereski@gmail.com, second@x.io"; });

  it("matches listed emails case-insensitively", () => {
    expect(isPlatformAdminEmail("DSmereski@Gmail.com")).toBe(true);
    expect(isPlatformAdminEmail("second@x.io")).toBe(true);
  });

  it("rejects others and empty", () => {
    expect(isPlatformAdminEmail("rando@x.io")).toBe(false);
    expect(isPlatformAdminEmail(null)).toBe(false);
  });

  it("empty env = nobody is admin", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "";
    expect(isPlatformAdminEmail("dsmereski@gmail.com")).toBe(false);
  });
});
