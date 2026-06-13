import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { ext } from "@/lib/extensions/registry";
import { houseAdProvider } from "@/lib/extensions/house-ad-provider";
import { shouldServeHouseAd } from "@/lib/ads";

/**
 * Renders an ad in the given slot IF the tenant has the `ads` feature enabled
 * (free plan) AND the slot is configured. Paid tenants (ads disabled) render
 * nothing. Uses the registered network provider (platform-paid) when present,
 * else the open-core house ad when config.ads.fallbackHouseAd is on.
 *
 * The served HTML is provider-authored:
 *  - house = our own static string (see lib/extensions/house-ad-provider.ts)
 *  - network = the trusted paid overlay (platform-paid package)
 * It is NEVER user/tenant input — dangerouslySetInnerHTML is intentional here.
 */
export async function AdSlot({
  slot,
}: {
  slot: "sidebar-bottom" | "between-threads" | "below-header";
}) {
  const ctx = await getFullTenantContext();
  if (!ctx) return null;

  const adsEnabled = isFeatureEnabled(ctx.features, "ads");
  if (!adsEnabled) return null; // paid tenants: ads feature is off → no ads

  if (!ctx.config.ads.slots.includes(slot)) return null; // slot not configured

  const networkActive = ext.adProvider.kind !== "noop";
  let served: { html: string } | null = null;

  if (networkActive) {
    // platform-paid network provider takes precedence
    served = await ext.adProvider.serve(slot, ctx.tenant.id);
  } else if (shouldServeHouseAd({ adsEnabled, slot, config: ctx.config, networkActive })) {
    // open-core house ad fallback
    served = await houseAdProvider.serve(slot, ctx.tenant.id);
  }

  if (!served) return null;

  // dangerouslySetInnerHTML is intentional: ad HTML originates exclusively from
  // provider-authored code (house = static string; network = trusted paid overlay).
  // It is NEVER derived from user or tenant input.
  return (
    <div
      data-ad-slot={slot}
      dangerouslySetInnerHTML={{ __html: served.html }}
    />
  );
}
