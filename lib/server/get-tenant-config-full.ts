import { unstable_cache } from "next/cache";
import { getCurrentTenant } from "./get-tenant";
import { resolveTenantConfig, getTenantDbOverrides } from "../config";
import { loadTenantFeatures } from "./get-tenant-features";
import type { FeatureMap } from "../features";
import type { TenantConfig } from "../config/schema";
import type { TenantPlan } from "../db";

export interface FullTenantContext {
  tenant: NonNullable<Awaited<ReturnType<typeof getCurrentTenant>>>;
  config: TenantConfig;
  features: FeatureMap;
}

/**
 * Cached config resolver. Passes tenantId + plan as explicit args (not closed
 * over) so unstable_cache can serialize the cache key cleanly. Tagged with
 * `tenant-config:<tenantId>` so revalidateTag in the write actions busts it.
 * TTL: 60 s; features are intentionally left uncached (loadTenantFeatures is
 * one cheap global-table query and flag toggles need immediate reflection).
 */
function makeCachedConfigResolver(tenantId: string) {
  return unstable_cache(
    async (id: string, p: TenantPlan) =>
      resolveTenantConfig(p, await getTenantDbOverrides(id)),
    [`tenant-config:${tenantId}`],
    { tags: [`tenant-config:${tenantId}`], revalidate: 60 },
  );
}

/** Resolve everything a tenant page needs, or null if not on a tenant host. */
export async function getFullTenantContext(): Promise<FullTenantContext | null> {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const cachedResolve = makeCachedConfigResolver(tenant.id);
  const [config, features] = await Promise.all([
    cachedResolve(tenant.id, tenant.plan),
    loadTenantFeatures(tenant),
  ]);
  return { tenant, config, features };
}
