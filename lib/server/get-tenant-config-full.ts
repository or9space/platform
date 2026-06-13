import { getCurrentTenant } from "./get-tenant";
import { resolveTenantConfig, getTenantDbOverrides } from "../config";
import { loadTenantFeatures } from "./get-tenant-features";
import type { FeatureMap } from "../features";
import type { TenantConfig } from "../config/schema";

export interface FullTenantContext {
  tenant: NonNullable<Awaited<ReturnType<typeof getCurrentTenant>>>;
  config: TenantConfig;
  features: FeatureMap;
}

/** Resolve everything a tenant page needs, or null if not on a tenant host. */
export async function getFullTenantContext(): Promise<FullTenantContext | null> {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const [config, features] = await Promise.all([
    getTenantDbOverrides(tenant.id).then((o) => resolveTenantConfig(tenant.plan, o)),
    loadTenantFeatures(tenant),
  ]);
  return { tenant, config, features };
}
