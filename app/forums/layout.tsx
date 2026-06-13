import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { TenantNav } from "@/components/tenant-nav";

export default async function ForumsLayout({ children }: { children: ReactNode }) {
  const ctx = await getFullTenantContext();
  if (!ctx || !isFeatureEnabled(ctx.features, "forums")) notFound();
  return (
    <div className="min-h-screen">
      <TenantNav active="forums" />
      {children}
    </div>
  );
}
