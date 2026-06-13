import { FEATURE_FLAGS, isValidFlagKey, type FeatureFlagKey } from "./feature-flags";
import { featureDefaultsForPlan, type FeatureMap } from "./config/apply-defaults";
import { FeatureDisabledError } from "./permissions";
import type { TenantPlan } from "./db";

const PLATFORM_CONTROLLED: ReadonlySet<FeatureFlagKey> = new Set(
  FEATURE_FLAGS.filter((f) => !f.tenantEditable).map((f) => f.key),
);

export type { FeatureMap };

export function resolveTenantFeatures(
  plan: TenantPlan,
  overrides: ReadonlyArray<{ key: string; enabled: boolean }>,
): FeatureMap {
  const map = featureDefaultsForPlan(plan);
  for (const o of overrides) {
    if (!isValidFlagKey(o.key)) continue;
    if (PLATFORM_CONTROLLED.has(o.key)) continue;
    map[o.key] = o.enabled;
  }
  return map;
}

export function isFeatureEnabled(map: FeatureMap, key: FeatureFlagKey): boolean {
  return map[key] === true;
}

export function requireFeature(map: FeatureMap, key: FeatureFlagKey): void {
  if (!isFeatureEnabled(map, key)) throw new FeatureDisabledError(key);
}
