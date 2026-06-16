import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listItems, listHoldings } from "@/lib/queries/inventory";
import { CATEGORY_LABELS } from "@/lib/inventory";
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
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory</h1>
      </div>

      <form method="GET" className="mb-6">
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search items…"
            className="flex-1 rounded border border-border-light bg-surface px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded border border-border-light px-4 py-2 text-sm hover:border-primary"
          >
            Search
          </button>
          {q && (
            <a
              href="/inventory"
              className="rounded border border-border-light px-4 py-2 text-sm hover:border-primary"
            >
              Clear
            </a>
          )}
        </div>
      </form>

      {canManage && (
        <div className="mb-6">
          <CreateItemForm />
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-text-secondary">No items found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="pb-2 pr-4 font-normal">Name</th>
                <th className="pb-2 pr-4 font-normal">Category</th>
                <th className="pb-2 pr-4 font-normal">Kind</th>
                <th className="pb-2 font-normal">Qty held</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-surface-hover/40">
                  <td className="py-2 pr-4">
                    <a
                      href={`/inventory/${item.id}`}
                      className="font-medium hover:text-text-primary hover:underline"
                    >
                      {item.name}
                    </a>
                  </td>
                  <td className="py-2 pr-4 text-text-secondary">
                    {CATEGORY_LABELS[item.category]}
                  </td>
                  <td className="py-2 pr-4 text-text-secondary">
                    {item.kind === "UNIQUE" ? "Unique" : "Fungible"}
                  </td>
                  <td className="py-2 font-mono text-text-secondary">
                    {quantityByItem.get(item.id) ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
