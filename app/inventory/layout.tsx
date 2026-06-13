import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { TenantNav } from "@/components/tenant-nav";

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  const ctx = await getFullTenantContext();
  if (!ctx || !isFeatureEnabled(ctx.features, "inventory")) notFound();

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(ctx.tenant.id, accountId);
  if (!viewer) notFound();

  return (
    <div className="min-h-screen">
      <TenantNav active="inventory" />
      {children}
    </div>
  );
}
