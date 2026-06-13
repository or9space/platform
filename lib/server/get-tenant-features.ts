import { prismaGlobal, type TenantPlan } from "../db";
import { resolveTenantFeatures, type FeatureMap } from "../features";

/** tenant_feature_flags is a GLOBAL table (no tenant_id RLS) — prismaGlobal is correct. */
export async function loadTenantFeatures(tenant: { id: string; plan: TenantPlan }): Promise<FeatureMap> {
  const overrides = await prismaGlobal.tenantFeatureFlag.findMany({
    where: { tenantId: tenant.id },
    select: { key: true, enabled: true },
  });
  return resolveTenantFeatures(tenant.plan, overrides);
}
