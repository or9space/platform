import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getTreasurySummary, listTreasuryEntries } from "@/lib/queries/treasury";
import { TREASURY_TYPES, TREASURY_CATEGORIES, CATEGORY_LABELS } from "@/lib/treasury";
import type { TreasuryType, TreasuryCategory } from "@/lib/treasury";
import { L } from "@/components/l";
import { AddEntryForm } from "./add-entry-form";
import { EntryActions } from "./entry-actions";

export default async function TreasuryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string }>;
}) {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  if (!viewer) notFound();

  const { type: rawType, category: rawCategory } = await searchParams;

  const filterType: TreasuryType | undefined =
    rawType && (TREASURY_TYPES as ReadonlyArray<string>).includes(rawType)
      ? (rawType as TreasuryType)
      : undefined;

  const filterCategory: TreasuryCategory | undefined =
    rawCategory && (TREASURY_CATEGORIES as ReadonlyArray<string>).includes(rawCategory)
      ? (rawCategory as TreasuryCategory)
      : undefined;

  const ctx = makeTenantContext(tenant.id);
  const [summary, entries] = await Promise.all([
    getTreasurySummary(ctx),
    listTreasuryEntries(ctx, { type: filterType, category: filterCategory }),
  ]);

  const canDelete = hasTier(viewer.tier, "COMMAND");

  const nonzeroCategories = Object.entries(summary.byCategory).filter(
    ([, net]) => net !== 0,
  );

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Treasury</h1>
      </div>

      {/* Balance summary */}
      <div className="mb-6 rounded border border-neutral-800 p-5">
        <div className="mb-4 flex flex-col gap-1">
          <span className="text-sm text-neutral-400">Balance</span>
          <span className="text-3xl font-bold">
            {summary.balance.toLocaleString()}{" "}
            <span className="text-lg font-normal text-neutral-400">
              <L k="currencyCode" fallback="aUEC" />
            </span>
          </span>
        </div>
        <div className="mb-4 flex gap-6 text-sm">
          <span className="text-green-400">
            Income: {summary.totalIncome.toLocaleString()}
          </span>
          <span className="text-red-400">
            Expenses: {summary.totalExpense.toLocaleString()}
          </span>
        </div>
        {nonzeroCategories.length > 0 && (
          <div className="border-t border-neutral-800 pt-3">
            <p className="mb-2 text-xs text-neutral-500">By category (net)</p>
            <div className="flex flex-wrap gap-3">
              {nonzeroCategories.map(([cat, net]) => (
                <span key={cat} className="text-sm">
                  <span className="text-neutral-400">
                    {CATEGORY_LABELS[cat as TreasuryCategory] ?? cat}:
                  </span>{" "}
                  <span className={net >= 0 ? "text-green-400" : "text-red-400"}>
                    {net.toLocaleString()}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add entry form */}
      <div className="mb-6">
        <AddEntryForm />
      </div>

      {/* Filter form */}
      <form method="GET" className="mb-4 flex flex-wrap gap-3">
        <select
          name="type"
          defaultValue={filterType ?? ""}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {TREASURY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "INCOME" ? "Income" : "Expense"}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={filterCategory ?? ""}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {TREASURY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-500"
        >
          Filter
        </button>
        {(filterType || filterCategory) && (
          <a
            href="/treasury"
            className="rounded border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-500"
          >
            Clear
          </a>
        )}
      </form>

      {/* Ledger */}
      {entries.length === 0 ? (
        <p className="text-neutral-400">No entries found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-500">
                <th className="pb-2 pr-4 font-normal">Date</th>
                <th className="pb-2 pr-4 font-normal">Type</th>
                <th className="pb-2 pr-4 font-normal">Category</th>
                <th className="pb-2 pr-4 font-normal">Amount</th>
                <th className="pb-2 pr-4 font-normal">Description</th>
                <th className="pb-2 pr-4 font-normal">Author</th>
                {canDelete && <th className="pb-2 font-normal"></th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-neutral-900 hover:bg-neutral-900/40">
                  <td className="py-2 pr-4 text-neutral-400">
                    {e.createdAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        e.type === "INCOME"
                          ? "rounded px-1.5 py-0.5 text-xs font-semibold bg-green-900/50 text-green-300"
                          : "rounded px-1.5 py-0.5 text-xs font-semibold bg-red-900/50 text-red-300"
                      }
                    >
                      {e.type === "INCOME" ? "Income" : "Expense"}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-neutral-300">
                    {CATEGORY_LABELS[e.category]}
                  </td>
                  <td className="py-2 pr-4 font-mono">
                    <span className={e.type === "INCOME" ? "text-green-400" : "text-red-400"}>
                      {e.type === "EXPENSE" ? "-" : ""}
                      {e.amount.toLocaleString()}
                    </span>{" "}
                    <span className="text-neutral-500 text-xs">
                      <L k="currencyCode" fallback="aUEC" />
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-neutral-300 max-w-xs truncate">
                    {e.description}
                  </td>
                  <td className="py-2 pr-4 text-neutral-400">{e.authorName}</td>
                  {canDelete && (
                    <td className="py-2">
                      <EntryActions entryId={e.id} />
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
