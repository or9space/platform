import { getCommodities } from "@/lib/uex/queries";
import { UexNotice, aUEC, safeUex } from "@/components/sc-tools/ui";

export default async function IndustryPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const commodities = await safeUex(getCommodities);
  if (!commodities.ok) return <Main><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></Main>;

  const k = kind ?? "mineral";
  const match = (c: { is_mineral: number; is_raw: number; is_refined: number; is_refinable: number; is_harvestable: number }) =>
    k === "raw" ? c.is_raw : k === "refined" ? c.is_refined : k === "harvest" ? c.is_harvestable : c.is_mineral;

  const rows = commodities.data
    .filter(match)
    .sort((a, b) => b.price_sell - a.price_sell);

  return (
    <Main>
      <nav className="flex gap-3 text-sm">
        {[["mineral", "Minerals"], ["raw", "Raw ores"], ["refined", "Refined"], ["harvest", "Harvestable"]].map(([key, label]) => (
          <a key={key} href={`/sc-tools/industry?kind=${key}`} className={k === key ? "font-bold text-neutral-100" : "text-neutral-400 hover:text-neutral-100"}>{label}</a>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No commodities in this category.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-500">
            <tr><th className="py-1">Commodity</th><th className="text-right">Base buy</th><th className="text-right">Base sell</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-neutral-900">
                <td className="py-1 pr-2">{c.name}{c.is_illegal ? <span className="ml-2 text-xs text-red-400">illegal</span> : null}</td>
                <td className="text-right font-mono">{c.price_buy ? aUEC(c.price_buy) : "—"}</td>
                <td className="text-right font-mono text-emerald-300">{c.price_sell ? aUEC(c.price_sell) : "—"}</td>
                <td className="text-right"><a href={`/sc-tools/prices?id=${c.id}`} className="text-xs underline text-neutral-400 hover:text-neutral-200">terminals</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl space-y-4 p-6"><h1 className="text-2xl font-bold">Industry</h1>{children}</main>;
}
