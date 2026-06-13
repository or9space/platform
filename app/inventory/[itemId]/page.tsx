import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getItem, listHoldingsByItem } from "@/lib/queries/inventory";
import { CATEGORY_LABELS } from "@/lib/inventory";
import type { HoldingState } from "@/lib/inventory";
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
  ACTIVE: "rounded px-1.5 py-0.5 text-xs font-semibold bg-green-900/50 text-green-300",
  LOST: "rounded px-1.5 py-0.5 text-xs font-semibold bg-yellow-900/50 text-yellow-300",
  DESTROYED: "rounded px-1.5 py-0.5 text-xs font-semibold bg-red-900/50 text-red-300",
  RETIRED: "rounded px-1.5 py-0.5 text-xs font-semibold bg-neutral-800 text-neutral-400",
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

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <a
          href="/inventory"
          className="text-sm text-neutral-400 hover:text-neutral-100"
        >
          &larr; Inventory
        </a>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {CATEGORY_LABELS[item.category]} &middot;{" "}
            {item.kind === "UNIQUE" ? "Unique" : "Fungible"}
          </p>
          {item.description && (
            <p className="mt-3 max-w-prose text-sm text-neutral-300 whitespace-pre-wrap">
              {item.description}
            </p>
          )}
        </div>
        {canDelete && (
          <DeleteItemButton itemId={item.id} />
        )}
      </div>

      {canManage && (
        <div className="mb-6">
          <CreateHoldingForm itemId={item.id} />
        </div>
      )}

      <h2 className="mb-3 font-semibold">Holdings</h2>

      {holdings.length === 0 ? (
        <p className="text-neutral-400 text-sm">No holdings recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-500">
                <th className="pb-2 pr-4 font-normal">Qty</th>
                <th className="pb-2 pr-4 font-normal">State</th>
                <th className="pb-2 pr-4 font-normal">Custodian</th>
                <th className="pb-2 pr-4 font-normal">Notes</th>
                {canManage && <th className="pb-2 font-normal"></th>}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.id} className="border-b border-neutral-900 hover:bg-neutral-900/40">
                  <td className="py-2 pr-4 font-mono">{h.quantity}</td>
                  <td className="py-2 pr-4">
                    <span className={STATE_CLASSES[h.state]}>
                      {STATE_LABELS[h.state]}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-neutral-400">
                    {h.custodianName ?? <span className="text-neutral-600">&mdash;</span>}
                  </td>
                  <td className="py-2 pr-4 max-w-xs text-neutral-300 whitespace-pre-wrap">
                    {h.notes ?? <span className="text-neutral-600">&mdash;</span>}
                  </td>
                  {canManage && (
                    <td className="py-2">
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
    </main>
  );
}
