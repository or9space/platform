import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getItem, listHoldingsByItem } from "@/lib/queries/inventory";
import { CATEGORY_LABELS } from "@/lib/inventory";
import type { HoldingState } from "@/lib/inventory";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
import { CreateHoldingForm } from "./create-holding-form";
import { HoldingActions } from "./holding-actions";
import { DeleteItemButton } from "./delete-item-button";

const STATE_LABELS: Record<HoldingState, string> = {
  ACTIVE: "Active",
  LOST: "Lost",
  DESTROYED: "Destroyed",
  RETIRED: "Retired",
};

const STATE_CLASSES: Record<HoldingState, string> = {
  ACTIVE: "px-1.5 py-0.5 text-xs font-mono font-semibold bg-green-900/30 text-green-300 border border-green-700/40",
  LOST: "px-1.5 py-0.5 text-xs font-mono font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-700/40",
  DESTROYED: "px-1.5 py-0.5 text-xs font-mono font-semibold bg-danger/30 text-fg-red-light border border-danger/40",
  RETIRED: "px-1.5 py-0.5 text-xs font-mono font-semibold bg-surface-elevated text-text-secondary border border-border",
};

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;

  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  if (!viewer) notFound();

  const ctx = makeTenantContext(tenant.id);
  const [item, holdings] = await Promise.all([
    getItem(ctx, itemId),
    listHoldingsByItem(ctx, itemId),
  ]);

  if (!item) notFound();

  const canManage = hasTier(viewer.tier, "OFFICER");
  const canDelete = hasTier(viewer.tier, "COMMAND");

  const totalQty = holdings.reduce((acc, h) => acc + h.quantity, 0);

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Back nav */}
      <a
        href="/inventory"
        className="mfd-label inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary"
      >
        &larr; INVENTORY
      </a>

      <PageHeader
        icon={Package}
        title={item.name}
        subtitle={`${CATEGORY_LABELS[item.category]} · ${item.kind === "UNIQUE" ? "Unique" : "Fungible"}`}
        actions={canDelete ? <DeleteItemButton itemId={item.id} /> : undefined}
      />

      {/* Item meta */}
      {item.description && (
        <MfdPanel chassis="neutral" title={<span>[ DESCRIPTION ]</span>} bodyPadding="md">
          <p className="max-w-prose text-sm text-text-secondary whitespace-pre-wrap">
            {item.description}
          </p>
        </MfdPanel>
      )}

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MfdPanel chassis="amber" bodyPadding="sm">
          <p className="mfd-label text-text-muted">Total qty</p>
          <p className="mt-0.5 font-mono tabular-nums text-2xl font-bold text-amber">{totalQty}</p>
        </MfdPanel>
        <MfdPanel chassis="neutral" bodyPadding="sm">
          <p className="mfd-label text-text-muted">Holdings</p>
          <p className="mt-0.5 font-mono tabular-nums text-2xl font-bold text-text-primary">{holdings.length}</p>
        </MfdPanel>
        <MfdPanel chassis="neutral" bodyPadding="sm" className="col-span-2 sm:col-span-1">
          <p className="mfd-label text-text-muted">Kind</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-text-primary">
            {item.kind === "UNIQUE" ? "UNIQUE" : "FUNGIBLE"}
          </p>
        </MfdPanel>
      </div>

      {/* Add holding (officers only) */}
      {canManage && (
        <MfdPanel
          chassis="primary"
          title={<span>[ ADD HOLDING ]</span>}
          bodyPadding="md"
        >
          <CreateHoldingForm itemId={item.id} />
        </MfdPanel>
      )}

      {/* Holdings table */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ HOLDINGS ]</span>}
        titleAside={
          <span className="font-mono text-xs tabular-nums text-text-muted">
            {holdings.length} records
          </span>
        }
        bodyPadding="none"
      >
        {holdings.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-muted">No holdings recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="mfd-label px-4 py-2 pr-4 font-normal text-text-muted">Qty</th>
                  <th className="mfd-label px-4 py-2 pr-4 font-normal text-text-muted">State</th>
                  <th className="mfd-label px-4 py-2 pr-4 font-normal text-text-muted">Custodian</th>
                  <th className="mfd-label px-4 py-2 pr-4 font-normal text-text-muted">Notes</th>
                  {canManage && <th className="mfd-label px-4 py-2 font-normal text-text-muted"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {holdings.map((h) => (
                  <tr key={h.id} className="hover:bg-surface-hover/40">
                    <td className="px-4 py-2.5 pr-4 font-mono tabular-nums text-amber">{h.quantity}</td>
                    <td className="px-4 py-2.5 pr-4">
                      <span className={STATE_CLASSES[h.state]}>
                        {STATE_LABELS[h.state].toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 pr-4 font-mono text-text-secondary">
                      {h.custodianName ?? <span className="text-text-muted">&mdash;</span>}
                    </td>
                    <td className="px-4 py-2.5 pr-4 max-w-xs text-text-secondary whitespace-pre-wrap">
                      {h.notes ?? <span className="text-text-muted">&mdash;</span>}
                    </td>
                    {canManage && (
                      <td className="px-4 py-2.5">
                        <HoldingActions
                          holdingId={h.id}
                          quantity={h.quantity}
                          state={h.state}
                          notes={h.notes}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MfdPanel>
    </div>
  );
}
