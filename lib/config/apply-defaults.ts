import { FEATURE_FLAGS, type FeatureFlagKey } from "../feature-flags";
import type { TenantPlan } from "../db";

export type FeatureMap = Record<FeatureFlagKey, boolean>;

/** The default on/off map for a plan, straight from the locked FEATURE_FLAGS matrix. */
export function featureDefaultsForPlan(plan: TenantPlan): FeatureMap {
  const map = {} as FeatureMap;
  for (const f of FEATURE_FLAGS) {
    map[f.key] = plan === "PAID" ? f.defaultPaid : f.defaultFree;
  }
  return map;
}
