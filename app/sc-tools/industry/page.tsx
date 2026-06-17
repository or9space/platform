import { getCommodities } from "@/lib/uex/queries";
import { UexNotice, aUEC, safeUex } from "@/components/sc-tools/ui";
import { Pickaxe } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";

export default async function IndustryPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const commodities = await safeUex(getCommodities);
  if (!commodities.ok) return <div className="p-3 sm:p-6"><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></div>;

  const k = kind ?? "mineral";
  const match = (c: { is_mineral: number; is_raw: number; is_refined: number; is_refinable: number; is_harvestable: number }) =>
    k === "raw" ? c.is_raw : k === "refined" ? c.is_refined : k === "harvest" ? c.is_harvestable : c.is_mineral;

  const rows = commodities.data
    .filter(match)
    .sort((a, b) => b.price_sell - a.price_sell);

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={Pickaxe} title="Industry" subtitle="Mining & refining — minerals, raw ores and refined goods." />
      <nav className="flex gap-3 text-sm">
        {[["mineral", "Minerals"], ["raw", "Raw ores"], ["refined", "Refined"], ["harvest", "Harvestable"]].map(([key, label]) => (
          <a key={key} href={`/sc-tools/industry?kind=${key}`} className={k === key ? "font-bold text-text-primary" : "text-text-secondary hover:text-text-primary"}>{label}</a>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">No commodities in this category.</p>
      ) : (
        <MfdPanel title={<span>[ INDUSTRY ]</span>} chassis="amber" bodyPadding="none">
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className="mfd-label py-2 pl-4 pr-2">Commodity</th>
                <th className="mfd-label py-2 pr-4 text-right">Base buy</th>
                <th className="mfd-label py-2 pr-4 text-right">Base sell</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-1.5 pl-4 pr-2">{c.name}{c.is_illegal ? <span className="ml-2 text-xs text-fg-red-light">illegal</span> : null}</td>
                  <td className="pr-4 text-right font-mono mfd-readout">{c.price_buy ? aUEC(c.price_buy) : "—"}</td>
                  <td className="pr-4 text-right font-mono text-success">{c.price_sell ? aUEC(c.price_sell) : "—"}</td>
                  <td className="pr-4 text-right"><a href={`/sc-tools/prices?id=${c.id}`} className="text-xs underline text-text-secondary hover:text-text-primary">terminals</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </MfdPanel>
      )}
    </div>
  );
}
