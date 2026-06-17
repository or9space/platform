import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";

/**
 * Gates /loot/pile to OFFICER+ within a loot-enabled tenant.
 * Lower tiers and anonymous visitors receive a 404 (same as FG pattern).
 */
export default async function LootPileLayout({ children }: { children: ReactNode }) {
  const full = await getFullTenantContext();
  if (!full || !isFeatureEnabled(full.features, "loot")) notFound();

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(full.tenant.id, accountId);
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  return <>{children}</>;
}
