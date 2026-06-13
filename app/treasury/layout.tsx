import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { TenantNav } from "@/components/tenant-nav";

export default async function TreasuryLayout({ children }: { children: ReactNode }) {
  const ctx = await getFullTenantContext();
  if (!ctx || !isFeatureEnabled(ctx.features, "treasury")) notFound();

  const accountId = await getSessionAccountId();
  const m = await getViewerMembership(ctx.tenant.id, accountId);
  if (!m || !hasTier(m.tier, "OFFICER")) notFound();

  return (
    <div className="min-h-screen">
      <TenantNav active="treasury" />
      {children}
    </div>
  );
}
