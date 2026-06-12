import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("hunter2hunter2");
    expect(hash).not.toContain("hunter2");
    expect(await verifyPassword("hunter2hunter2", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("rejects passwords under 10 chars at hash time", async () => {
    await expect(hashPassword("short")).rejects.toThrow(/at least 10/);
  });
});
