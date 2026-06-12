import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, _resetRateLimitStore } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetRateLimitStore();
  });
  afterEach(() => vi.useRealTimers());

  it("allows up to max requests in window", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("k", 5, 60_000).allowed).toBe(true);
    }
    expect(checkRateLimit("k", 5, 60_000).allowed).toBe(false);
  });

  it("separates keys", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("a", 5, 60_000);
    expect(checkRateLimit("a", 5, 60_000).allowed).toBe(false);
    expect(checkRateLimit("b", 5, 60_000).allowed).toBe(true);
  });

  it("window slides", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("k", 5, 60_000);
    expect(checkRateLimit("k", 5, 60_000).allowed).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit("k", 5, 60_000).allowed).toBe(true);
  });
});
