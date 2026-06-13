import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { TenantNav } from "@/components/tenant-nav";

export default async function MembersLayout({ children }: { children: ReactNode }) {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  if (!viewer) redirect("/login");

  return (
    <div className="min-h-screen">
      <TenantNav active="members" />
      {children}
    </div>
  );
}
