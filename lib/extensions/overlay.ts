/**
 * Overlay seam. THIS FILE IS THE NO-OP STUB shipped in the open-source repo.
 *
 * The hosted or9.space build replaces this single file with a re-export of the
 * private `platform-paid` overlay:
 *
 *     export * from "platform-paid/src/register";
 *
 * Because the seam is a STATIC import (see instrumentation.ts + the billing
 * webhook route), Next transpiles + bundles whichever implementation is present
 * here into the standalone output — no runtime module resolution needed.
 *
 * OSS / self-host: this stub stays, billing is a no-op, the webhook 404-equivalent
 * is returned, and the ExtensionRegistry keeps its no-op providers.
 */
import type { ExtensionRegistry } from "./registry";
import type { TenantPlan } from "../db";

export function registerPaidExtensions(_ext: ExtensionRegistry): void {
  // no-op: the OSS build registers nothing; no-op providers stay in place.
}

export async function handleStripeWebhook(
  _raw: string,
  _sig: string,
  _setTenantPlan: (tenantId: string, plan: TenantPlan) => Promise<void>,
): Promise<{ received: true } | { error: string }> {
  return { error: "Billing is not enabled on this deployment" };
}
