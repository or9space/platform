import { notFound } from "next/navigation";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getTreasurySummary, listTreasuryEntries } from "@/lib/queries/treasury";
import { TREASURY_TYPES, TREASURY_CATEGORIES, CATEGORY_LABELS } from "@/lib/treasury";
import type { TreasuryType, TreasuryCategory } from "@/lib/treasury";
import { L } from "@/components/l";
import { MfdPanel } from "@/components/ui/mfd";
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
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={Wallet} title="Treasury" subtitle="Org finance log" />

      {/* Balance + stats */}
      <MfdPanel
        chassis="amber"
        title={<span>[ TREASURY ]</span>}
        titleAside={
          <span className="mfd-label">
            <L k="currencyCode" fallback="aUEC" />
          </span>
        }
        bodyPadding="md"
      >
        <div className="flex flex-col gap-4">
          {/* Running balance */}
          <div className="flex flex-col gap-0.5">
            <span className="mfd-label">BALANCE</span>
            <span
              className={`mfd-readout text-3xl font-mono font-semibold tabular-nums tracking-wide ${
                summary.balance >= 0 ? "text-success" : "text-fg-red-light"
              }`}
            >
              {summary.balance.toLocaleString()}{" "}
              <span className="text-lg font-normal text-text-muted">
                <L k="currencyCode" fallback="aUEC" />
              </span>
            </span>
          </div>

          {/* Income / Expense row */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <div className="flex flex-col gap-0.5">
                <span className="mfd-label">INCOME</span>
                <span className="mfd-readout text-success">
                  {summary.totalIncome.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-fg-red-light" />
              <div className="flex flex-col gap-0.5">
                <span className="mfd-label">EXPENSES</span>
                <span className="mfd-readout text-fg-red-light">
                  {summary.totalExpense.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* By-category breakdown */}
          {nonzeroCategories.length > 0 && (
            <div className="border-t border-border/60 pt-3">
              <p className="mfd-label mb-2">BY CATEGORY (NET)</p>
              <div className="flex flex-wrap gap-4">
                {nonzeroCategories.map(([cat, net]) => (
                  <div key={cat} className="flex flex-col gap-0.5">
                    <span className="mfd-label">
                      {CATEGORY_LABELS[cat as TreasuryCategory] ?? cat}
                    </span>
                    <span
                      className={`mfd-readout ${net >= 0 ? "text-success" : "text-fg-red-light"}`}
                    >
                      {net >= 0 ? "+" : ""}
                      {net.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </MfdPanel>

      {/* Add entry form */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ ADD ENTRY ]</span>}
        bodyPadding="md"
      >
        <AddEntryForm />
      </MfdPanel>

      {/* Ledger */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ LEDGER ]</span>}
        titleAside={
          <span className="mfd-label">{entries.length} RECORDS</span>
        }
        bodyPadding="none"
      >
        {/* Filter form */}
        <div className="flex flex-wrap gap-3 border-b border-border/60 px-4 py-3">
          <form method="GET" className="flex flex-wrap gap-3">
            <select
              name="type"
              defaultValue={filterType ?? ""}
              className="rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
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
              className="rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
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
              className="rounded border border-border px-4 py-1.5 text-sm text-text-primary hover:border-primary hover:text-primary"
            >
              Filter
            </button>
            {(filterType || filterCategory) && (
              <a
                href="/treasury"
                className="rounded border border-border px-4 py-1.5 text-sm text-text-muted hover:border-primary hover:text-primary"
              >
                Clear
              </a>
            )}
          </form>
        </div>

        {entries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-muted">No entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="mfd-label px-4 py-2 font-normal">DATE</th>
                  <th className="mfd-label px-4 py-2 font-normal">TYPE</th>
                  <th className="mfd-label px-4 py-2 font-normal">CATEGORY</th>
                  <th className="mfd-label px-4 py-2 font-normal">AMOUNT</th>
                  <th className="mfd-label px-4 py-2 font-normal">DESCRIPTION</th>
                  <th className="mfd-label px-4 py-2 font-normal">AUTHOR</th>
                  {canDelete && <th className="mfd-label px-4 py-2 font-normal"></th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-border/40 hover:bg-surface-elevated/60"
                  >
                    <td className="px-4 py-2 text-text-muted">
                      {e.createdAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          e.type === "INCOME"
                            ? "rounded px-1.5 py-0.5 text-xs font-semibold bg-success/10 text-success"
                            : "rounded px-1.5 py-0.5 text-xs font-semibold bg-fg-red-light/10 text-fg-red-light"
                        }
                      >
                        {e.type === "INCOME" ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-text-secondary">
                      {CATEGORY_LABELS[e.category]}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`mfd-readout ${
                          e.type === "INCOME" ? "text-success" : "text-fg-red-light"
                        }`}
                      >
                        {e.type === "EXPENSE" ? "-" : ""}
                        {e.amount.toLocaleString()}
                      </span>{" "}
                      <span className="mfd-label text-xs">
                        <L k="currencyCode" fallback="aUEC" />
                      </span>
                    </td>
                    <td className="px-4 py-2 text-text-secondary max-w-xs truncate">
                      {e.description}
                    </td>
                    <td className="px-4 py-2 text-text-secondary">{e.authorName}</td>
                    {canDelete && (
                      <td className="px-4 py-2">
                        <EntryActions entryId={e.id} />
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
