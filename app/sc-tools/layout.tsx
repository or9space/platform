import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { TenantNav } from "@/components/tenant-nav";

const TOOLS = [
  { href: "/sc-tools", label: "Overview" },
  { href: "/sc-tools/prices", label: "Prices" },
  { href: "/sc-tools/compare", label: "Compare" },
  { href: "/sc-tools/trade", label: "Trade Routes" },
  { href: "/sc-tools/hangar", label: "Hangar" },
  { href: "/sc-tools/loadouts", label: "Ship Prices" },
  { href: "/sc-tools/logistics", label: "Logistics" },
  { href: "/sc-tools/industry", label: "Industry" },
  { href: "/sc-tools/starmap", label: "Star Map" },
];

export default async function ScToolsLayout({ children }: { children: ReactNode }) {
  const ctx = await getFullTenantContext();
  if (!ctx || !isFeatureEnabled(ctx.features, "scTools")) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  return (
    <div className="min-h-screen">
      <TenantNav active="sc-tools" />
      <div className="border-b border-neutral-900 bg-neutral-950/60">
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-3 px-6 py-2 text-xs">
          {TOOLS.map((t) => (
            <a key={t.href} href={t.href} className="text-neutral-400 hover:text-neutral-100">{t.label}</a>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
