import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { TenantShell } from "@/components/tenant-shell";

export default async function ForumsLayout({ children }: { children: ReactNode }) {
  const ctx = await getFullTenantContext();
  if (!ctx || !isFeatureEnabled(ctx.features, "forums")) notFound();
  return (
    <TenantShell>{children}</TenantShell>
  );
}
