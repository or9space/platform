import type { TenantConfig } from "./config/schema";

/**
 * Pure decision function: should the house ad be served for this slot?
 *
 * Rules:
 *  - If ads feature is disabled (paid tenant) → no ad.
 *  - If the slot is not in the tenant's configured slot list → no ad.
 *  - If a network provider is active (platform-paid overlay) → it handles it, not us.
 *  - Otherwise, serve house ad only when fallbackHouseAd is on.
 */
export function shouldServeHouseAd(opts: {
  adsEnabled: boolean;
  slot: string;
  config: Pick<TenantConfig, "ads">;
  networkActive: boolean;
}): boolean {
  if (!opts.adsEnabled) return false;
  if (!opts.config.ads.slots.includes(opts.slot as "sidebar-bottom" | "between-threads" | "below-header")) return false;
  if (opts.networkActive) return false; // network provider handles it
  return opts.config.ads.fallbackHouseAd;
}
