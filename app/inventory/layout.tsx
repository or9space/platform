import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  const ctx = await getFullTenantContext();
  if (!ctx || !isFeatureEnabled(ctx.features, "inventory")) notFound();

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(ctx.tenant.id, accountId);
  if (!viewer) notFound();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800 p-4">
        <nav className="flex gap-6 text-sm">
          <a href="/inventory" className="font-bold">
            Inventory
          </a>
          <a href="/members" className="text-neutral-400 hover:text-neutral-100">Members</a>
          <a href="/treasury" className="text-neutral-400 hover:text-neutral-100">Treasury</a>
        </nav>
      </header>
      {children}
    </div>
  );
}
