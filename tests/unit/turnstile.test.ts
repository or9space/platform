import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyTurnstile } from "@/lib/turnstile";

describe("verifyTurnstile", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => { delete process.env.TURNSTILE_SECRET; });
  afterEach(() => { globalThis.fetch = realFetch; });

  it("passes open when TURNSTILE_SECRET is unset", async () => {
    expect(await verifyTurnstile("any-token")).toBe(true);
  });

  it("verifies with Cloudflare when secret present", async () => {
    process.env.TURNSTILE_SECRET = "sec";
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    ) as any;
    expect(await verifyTurnstile("tok")).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects when Cloudflare says no", async () => {
    process.env.TURNSTILE_SECRET = "sec";
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    ) as any;
    expect(await verifyTurnstile("tok")).toBe(false);
  });
});
