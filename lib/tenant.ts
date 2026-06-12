export interface TenantContext {
  tenantId: string;
}

export function makeTenantContext(tenantId: string): TenantContext {
  if (!tenantId || typeof tenantId !== "string") {
    throw new Error("makeTenantContext: tenantId must be a non-empty string");
  }
  return { tenantId };
}
