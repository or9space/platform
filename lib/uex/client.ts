/**
 * UEX Corp API 2.0 client. https://api.uexcorp.uk/2.0/
 *
 * Read endpoints are public; an application token (UEX_API_TOKEN) is optional —
 * when present it's sent as a Bearer header for higher rate limits + attribution.
 * Responses are JSON `{ status, http_code, data }`. We cache via Next's fetch
 * cache (revalidate) so we stay well under UEX's 120 req/min limit.
 *
 * This is the single seam between the SC-tools pages and UEX: swap the base URL
 * or auth here and every tool follows.
 */

const BASE = "https://api.uexcorp.uk/2.0";

export interface UexEnvelope<T> {
  status: string;
  http_code?: number;
  data: T;
}

export class UexError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "UexError";
  }
}

function authHeaders(): Record<string, string> {
  const token = process.env.UEX_API_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch a UEX resource and return its `data` array, or throw UexError.
 * `revalidate` seconds: prices change often (~10min), catalogs rarely (~1 day).
 */
export async function uexGet<T>(
  resource: string,
  opts: { query?: Record<string, string | number | undefined>; revalidate?: number } = {},
): Promise<T> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  const url = `${BASE}/${resource}${qs ? `?${qs}` : ""}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", ...authHeaders() },
      next: { revalidate: opts.revalidate ?? 600 },
    });
  } catch (e) {
    throw new UexError(`UEX request failed: ${resource}`, e);
  }
  if (!res.ok) throw new UexError(`UEX ${resource} returned HTTP ${res.status}`);

  let body: UexEnvelope<T>;
  try {
    body = (await res.json()) as UexEnvelope<T>;
  } catch (e) {
    throw new UexError(`UEX ${resource} returned non-JSON`, e);
  }
  if (body.status !== "ok") throw new UexError(`UEX ${resource} status: ${body.status}`);
  return body.data;
}

/** True if an application token is configured (affects rate-limit headroom only). */
export function uexTokenConfigured(): boolean {
  return Boolean(process.env.UEX_API_TOKEN);
}
