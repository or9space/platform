import { FEATURE_FLAGS, type FeatureFlagKey } from "../feature-flags";
import type { TenantPlan } from "../db";

export type FeatureMap = Record<FeatureFlagKey, boolean>;

/**
 * The default on/off map for a plan, straight from the locked FEATURE_FLAGS
 * matrix. FREE gets the limited `defaultFree` set; every paid tier (PAID hosted
 * and SELF_HOSTED open-core) gets the full `defaultPaid` set.
 */
export function featureDefaultsForPlan(plan: TenantPlan): FeatureMap {
  const map = {} as FeatureMap;
  for (const f of FEATURE_FLAGS) {
    map[f.key] = plan === "FREE" ? f.defaultFree : f.defaultPaid;
  }
  return map;
}
