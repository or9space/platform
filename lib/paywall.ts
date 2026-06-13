import { FEATURE_FLAGS, type FeatureFlagKey } from "./feature-flags";
import type { TenantPlan } from "./db";

/**
 * Config dotted-paths only paid tenants may set. NOT yet wired into a writer:
 * the Phase 2 config actions (updateBrandingCore/updateLabelsCore) use `.strict()`
 * zod schemas that reject `domains`/`integrations` keys outright, so these paths
 * are unreachable today. `isConfigPathAllowedForPlan` exists for the future
 * domains/integrations editor — wire it there when that lands, and do not drop
 * the `.strict()` modifiers, which are the current enforcement.
 */
export const PAYWALL_CONFIG_PATHS: ReadonlySet<string> = new Set([
  "domains.customDomain",
  "integrations.discord.botToken",
]);

const PAID_ONLY_FLAGS: ReadonlySet<FeatureFlagKey> = new Set(
  FEATURE_FLAGS.filter((f) => f.paidOnly).map((f) => f.key),
);

export class PaywallError extends Error {
  constructor(message = "This requires a paid plan") {
    super(message);
    this.name = "PaywallError";
  }
}

export function isFlagAllowedForPlan(plan: TenantPlan, key: FeatureFlagKey): boolean {
  if (plan === "PAID") return true;
  return !PAID_ONLY_FLAGS.has(key);
}

export function isConfigPathAllowedForPlan(plan: TenantPlan, path: string): boolean {
  if (plan === "PAID") return true;
  return !PAYWALL_CONFIG_PATHS.has(path);
}
