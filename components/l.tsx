import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import type { TenantConfig } from "@/lib/config/schema";

type LabelKey = keyof TenantConfig["labels"];

/**
 * Renders a tenant-configured label. Server component: reads the tenant config
 * once per render. Falls back to the provided `fallback` off a tenant host.
 *   <L k="memberPlural" fallback="Members" />
 */
export async function L({ k, fallback }: { k: LabelKey; fallback: string }) {
  const ctx = await getFullTenantContext();
  return <>{ctx?.config.labels[k] ?? fallback}</>;
}
