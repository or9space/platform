import type { Metadata } from "next";
import Link from "next/link";
import { Coins } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { makeTenantContext } from "@/lib/tenant";
import { listLootMembersWithBalances } from "@/lib/queries/loot";

import { PileConsole } from "@/components/loot/pile-console";

export const metadata: Metadata = { title: "Loot Pile" };

/**
 * Officer spend console — gate is in layout.tsx (OFFICER+, loot feature enabled).
 * Loads all members with live balances and renders the client-side PileConsole.
 */
export default async function LootPilePage() {
  const full = await getFullTenantContext();
  // layout.tsx already guards — this is a runtime safety check.
  if (!full) return null;

  const ctx = makeTenantContext(full.tenant.id);
  const members = await listLootMembersWithBalances(ctx);

  return (
    <div className="p-3 sm:p-6 animate-page-enter max-w-lg mx-auto space-y-6">
      <PageHeader
        icon={Coins}
        title="Loot Pile"
        subtitle="Officer spend console — deduct points from members."
        actions={
          <Link
            href="/loot"
            className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            ← Loot home
          </Link>
        }
      />

      {members.length === 0 ? (
        <p className="text-sm text-text-muted">
          No loot members yet. Add participants from the{" "}
          <Link href="/loot" className="text-primary hover:underline">
            loot page
          </Link>
          .
        </p>
      ) : (
        <PileConsole members={members} />
      )}
    </div>
  );
}
