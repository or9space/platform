import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getMemberBalance, listMemberTransactions } from "@/lib/queries/loot";
import { formatPoints, TXN_TYPES } from "@/lib/loot";
import type { LootTxnType } from "@/lib/loot";
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
  SPEND: "bg-red-900/50 text-red-300",
  TRANSFER_IN: "bg-green-900/50 text-green-300",
  TRANSFER_OUT: "bg-yellow-900/50 text-yellow-300",
  ADJUST: "bg-neutral-800 text-neutral-300",
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
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-4 text-sm">
        <a href="/loot" className="text-neutral-400 hover:text-neutral-200">
          Leaderboard
        </a>
        <span className="mx-2 text-neutral-600">/</span>
        <span className="text-neutral-300">{lootMember.displayName}</span>
      </div>

      <div className="mb-6 rounded border border-neutral-800 p-5">
        <h1 className="text-xl font-bold mb-1">{lootMember.displayName}</h1>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono">
            {formatPoints(balanceTenths)}
          </span>
          <span className="text-neutral-400 text-sm">points</span>
        </div>
      </div>

      {/* Action forms */}
      <div className="mb-6 flex flex-col gap-4">
        {canModerate && (
          <SpendForm memberId={memberId} />
        )}
        {canAdjust && (
          <AdjustForm memberId={memberId} />
        )}
        {viewer && !isSelf && (
          <TransferForm toMemberId={memberId} />
        )}
      </div>

      {/* Transaction history */}
      <section>
        <h2 className="mb-3 font-semibold text-neutral-300">Transaction history</h2>
        {transactions.length === 0 ? (
          <p className="text-neutral-500 text-sm">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-neutral-500">
                  <th className="pb-2 pr-4 font-normal">Date</th>
                  <th className="pb-2 pr-4 font-normal">Type</th>
                  <th className="pb-2 pr-4 font-normal text-right">Amount</th>
                  <th className="pb-2 font-normal">Note</th>
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
                      className="border-b border-neutral-900 hover:bg-neutral-900/40"
                    >
                      <td className="py-2 pr-4 text-neutral-400">
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
                          <span className="text-neutral-500 text-xs">{t.type}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 font-mono text-right">
                        <span
                          className={
                            t.amountTenths < 0 ? "text-red-400" : "text-green-400"
                          }
                        >
                          {t.amountTenths >= 0 ? "+" : ""}
                          {formatPoints(t.amountTenths)}
                        </span>
                      </td>
                      <td className="py-2 text-neutral-400 max-w-xs truncate">
                        {t.note ?? <span className="text-neutral-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
