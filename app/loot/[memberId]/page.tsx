import { notFound } from "next/navigation";
import { Coins } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getMemberBalance, listMemberTransactions } from "@/lib/queries/loot";
import { formatPoints, TXN_TYPES } from "@/lib/loot";
import type { LootTxnType } from "@/lib/loot";
import { MfdPanel } from "@/components/ui/mfd";
import { SpendForm } from "./spend-form";
import { AdjustForm } from "./adjust-form";
import { TransferForm } from "./transfer-form";

const TXN_LABELS: Record<LootTxnType, string> = {
  SPEND: "Spend",
  TRANSFER_IN: "Transfer in",
  TRANSFER_OUT: "Transfer out",
  ADJUST: "Adjust",
};

const TXN_COLORS: Record<LootTxnType, string> = {
  SPEND: "bg-danger/50 text-fg-red-light",
  TRANSFER_IN: "bg-green-900/50 text-green-300",
  TRANSFER_OUT: "bg-yellow-900/50 text-yellow-300",
  ADJUST: "bg-surface-elevated text-text-secondary",
};

export default async function LootMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;

  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);

  const ctx = makeTenantContext(tenant.id);

  // Inline lookup — no dedicated getLootMember query exists
  const lootMember = await db(ctx).lootMember.findFirst({
    where: { id: memberId },
    select: { id: true, displayName: true, membershipId: true },
  });
  if (!lootMember) notFound();

  const [balanceTenths, transactions] = await Promise.all([
    getMemberBalance(ctx, memberId),
    listMemberTransactions(ctx, memberId),
  ]);

  const canModerate = viewer ? hasTier(viewer.tier, "OFFICER") : false;
  const canAdjust = viewer ? hasTier(viewer.tier, "COMMAND") : false;

  // Find the viewer's own loot member id (to detect self-transfer)
  let viewerLootMemberId: string | null = null;
  if (viewer) {
    const mine = await db(ctx).lootMember.findFirst({
      where: { membershipId: viewer.id },
      select: { id: true },
    });
    viewerLootMemberId = mine?.id ?? null;
  }

  const isSelf = viewerLootMemberId === memberId;

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Coins className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{lootMember.displayName}</h1>
          <p className="text-sm text-text-muted">
            <a href="/loot" className="hover:text-text-primary">Leaderboard</a>
            <span className="mx-1.5 text-text-muted">/</span>
            Member detail
          </p>
        </div>
      </div>

      {/* Balance hero */}
      <MfdPanel chassis="amber" title="[ BALANCE ]" bodyPadding="lg">
        <div className="flex flex-col gap-1">
          <span className="mfd-label">Current balance</span>
          <span className={`mfd-readout text-3xl font-mono font-bold tabular-nums ${isSelf ? "text-amber" : "text-amber"}`}>
            {formatPoints(balanceTenths)}
          </span>
          <span className="mfd-label text-text-muted">points</span>
        </div>
      </MfdPanel>

      {/* Action forms */}
      {(canModerate || canAdjust || (viewer && !isSelf)) && (
        <MfdPanel chassis="neutral" title="[ ACTIONS ]" bodyPadding="md">
          <div className="flex flex-col gap-4">
            {canModerate && <SpendForm memberId={memberId} />}
            {canAdjust && <AdjustForm memberId={memberId} />}
            {viewer && !isSelf && <TransferForm toMemberId={memberId} />}
          </div>
        </MfdPanel>
      )}

      {/* Transaction history */}
      <MfdPanel
        chassis="neutral"
        title="[ LEDGER ]"
        titleAside={<span className="mfd-readout">{transactions.length} entries</span>}
        bodyPadding="none"
      >
        {transactions.length === 0 ? (
          <p className="px-4 py-3 text-text-muted text-sm">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 pb-2 pt-3 font-normal mfd-label">Date</th>
                  <th className="pb-2 pt-3 pr-4 font-normal mfd-label">Type</th>
                  <th className="pb-2 pt-3 pr-4 font-normal mfd-label text-right">Amount</th>
                  <th className="pb-2 pt-3 pr-4 font-normal mfd-label">Note</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const txnType = (TXN_TYPES as ReadonlyArray<string>).includes(t.type)
                    ? (t.type as LootTxnType)
                    : null;
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-border hover:bg-surface-hover/40"
                    >
                      <td className="py-2 pl-4 pr-4 text-text-secondary">
                        {t.createdAt.toISOString().slice(0, 10)}
                      </td>
                      <td className="py-2 pr-4">
                        {txnType ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-semibold ${TXN_COLORS[txnType]}`}
                          >
                            {TXN_LABELS[txnType]}
                          </span>
                        ) : (
                          <span className="text-text-muted text-xs">{t.type}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <span
                          className={`mfd-readout ${t.amountTenths < 0 ? "text-fg-red-light" : "text-success"}`}
                        >
                          {t.amountTenths >= 0 ? "+" : ""}
                          {formatPoints(t.amountTenths)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-text-secondary max-w-xs truncate">
                        {t.note ?? <span className="text-text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </MfdPanel>
    </div>
  );
}
