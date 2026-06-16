import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { TenantShell } from "@/components/tenant-shell";

export default async function LootLayout({ children }: { children: ReactNode }) {
  const ctx = await getFullTenantContext();
  if (!ctx || !isFeatureEnabled(ctx.features, "loot")) notFound();

  // The loot leaderboard exposes member names + point balances — require an
  // org membership to view (any tier; no minimum). Anonymous visitors must not
  // see another org's internal economy.
  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(ctx.tenant.id, accountId);
  if (!viewer) notFound();

  return (
    <TenantShell>{children}</TenantShell>
  );
}
