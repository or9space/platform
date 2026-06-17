import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listItems, listHoldings } from "@/lib/queries/inventory";
import { CATEGORY_LABELS } from "@/lib/inventory";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
import { CreateItemForm } from "./create-item-form";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  if (!viewer) notFound();

  const { q } = await searchParams;
  const ctx = makeTenantContext(tenant.id);

  const [items, allHoldings] = await Promise.all([
    listItems(ctx, q),
    listHoldings(ctx),
  ]);

  // Compute total quantity per item across all holdings
  const quantityByItem = new Map<string, number>();
  for (const h of allHoldings) {
    quantityByItem.set(h.itemId, (quantityByItem.get(h.itemId) ?? 0) + h.quantity);
  }

  const canManage = hasTier(viewer.tier, "OFFICER");

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader
        icon={Package}
        title="Inventory"
        subtitle="Org-wide gear, ships, and consumables"
        readout={<>{items.length} ITEMS</>}
      />

      {/* Search */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ SEARCH ]</span>}
        bodyPadding="md"
      >
        <form method="GET">
          <div className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search items…"
              className="flex-1 border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="border border-border px-4 py-2 text-xs mfd-label hover:border-primary hover:text-primary"
            >
              SEARCH
            </button>
            {q && (
              <a
                href="/inventory"
                className="border border-border px-4 py-2 text-xs mfd-label hover:border-primary hover:text-primary"
              >
                CLEAR
              </a>
            )}
          </div>
        </form>
      </MfdPanel>

      {/* Add item (officers only) */}
      {canManage && (
        <MfdPanel
          chassis="primary"
          title={<span>[ ADD ITEM ]</span>}
          bodyPadding="md"
        >
          <CreateItemForm />
        </MfdPanel>
      )}

      {/* Items table */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ INVENTORY ]</span>}
        titleAside={
          <span className="mfd-readout font-mono text-xs text-text-muted tabular-nums">
            {items.length} records
          </span>
        }
        bodyPadding="none"
      >
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-muted">No items found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="mfd-label px-4 py-2 pr-4 font-normal text-text-muted">Name</th>
                  <th className="mfd-label px-4 py-2 pr-4 font-normal text-text-muted">Category</th>
                  <th className="mfd-label px-4 py-2 pr-4 font-normal text-text-muted">Kind</th>
                  <th className="mfd-label px-4 py-2 font-normal text-text-muted">Qty held</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-hover/40">
                    <td className="px-4 py-2.5 pr-4">
                      <a
                        href={`/inventory/${item.id}`}
                        className="font-medium text-text-primary hover:text-primary"
                      >
                        {item.name}
                      </a>
                    </td>
                    <td className="px-4 py-2.5 pr-4 text-text-secondary">
                      {CATEGORY_LABELS[item.category]}
                    </td>
                    <td className="px-4 py-2.5 pr-4 text-text-secondary">
                      {item.kind === "UNIQUE" ? "Unique" : "Fungible"}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-amber">
                      {quantityByItem.get(item.id) ?? 0}
                    </td>
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
