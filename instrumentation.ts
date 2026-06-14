/**
 * Next.js startup hook. Registers the overlay's real providers onto the
 * ExtensionRegistry when Stripe keys are present.
 *
 * The overlay is imported through the `lib/extensions/overlay` seam: in OSS it's
 * a no-op stub; the hosted build swaps that file for the real platform-paid
 * re-export. Either way this is a normal static import (transpiled + bundled by
 * Next), so there's no runtime module-resolution fragility.
 */
import { ext } from "@/lib/extensions/registry";
import { registerPaidExtensions } from "@/lib/extensions/overlay";

export function register() {
  if (!process.env.STRIPE_SECRET_KEY) return; // fail-safe: no keys, no overlay
  try {
    registerPaidExtensions(ext);
    if (ext.billingProvider.kind !== "noop") {
      console.log("[or9] paid overlay registered:", ext.billingProvider.kind);
    }
  } catch (e) {
    console.warn("[or9] overlay registration failed:", (e as Error).message);
  }
}
