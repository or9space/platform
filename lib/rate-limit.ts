/**
 * In-memory sliding-window rate limiter. Single-instance only (Phase 1 —
 * one VPS, one Node process). Swap for a Postgres/Redis-backed limiter
 * when the app scales horizontally.
 */
type Entry = number[]; // timestamps (ms) of accepted hits

let store = new Map<string, Entry>();

export const CONTENT_LIMIT = { maxRequests: 10, windowMs: 60_000 };
export const SUPPORT_TICKET_LIMIT = { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 };
export const SIGNUP_LIMIT = { maxRequests: 3, windowMs: 60 * 60 * 1000 };

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= maxRequests) {
    store.set(key, hits);
    return { allowed: false, remaining: 0 };
  }
  hits.push(now);
  store.set(key, hits);
  return { allowed: true, remaining: maxRequests - hits.length };
}

/** Test hook. */
export function _resetRateLimitStore(): void {
  store = new Map();
}
