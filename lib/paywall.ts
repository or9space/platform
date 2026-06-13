import { FEATURE_FLAGS, type FeatureFlagKey } from "./feature-flags";
import type { TenantPlan } from "./db";

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
