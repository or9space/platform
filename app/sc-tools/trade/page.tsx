import { getCommodities, getTradeRoutes } from "@/lib/uex/queries";
import { UexNotice, aUEC, safeUex } from "@/components/sc-tools/ui";
import { Picker } from "../prices/page";
import { TrendingUp } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";

export default async function TradePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const commodities = await safeUex(getCommodities);
  if (!commodities.ok) return <div className="p-3 sm:p-6"><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></div>;

  const list = commodities.data.filter((c) => c.is_sellable).sort((a, b) => a.name.localeCompare(b.name));
  const selectedId = id ? Number(id) : list[0]?.id;
  const selected = list.find((c) => c.id === selectedId);

  const routes = selectedId ? await safeUex(() => getTradeRoutes(selectedId)) : { ok: true as const, data: [] };
  const rows = routes.ok ? [...routes.data].sort((a, b) => b.profit - a.profit).slice(0, 50) : [];

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={TrendingUp} title="Trade Routes" subtitle="Most profitable hauls right now, ranked by profit and ROI." />
      <Picker list={list} selectedId={selectedId} />
      {selected && <h2 className="text-lg font-semibold">Best routes — {selected.name}</h2>}
      {!routes.ok ? (
        <UexNotice>Couldn&apos;t load routes for this commodity.</UexNotice>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-muted">No profitable routes reported.</p>
      ) : (
        <MfdPanel title={<span>[ TRADE ROUTES ]</span>} chassis="amber" bodyPadding="none">
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className="mfd-label py-2 pl-4 pr-2">Buy at</th>
                <th className="mfd-label py-2 pr-2">Sell at</th>
                <th className="mfd-label py-2 pr-4 text-right">Profit/SCU</th>
                <th className="mfd-label py-2 pr-4 text-right">ROI</th>
                <th className="mfd-label py-2 pr-4 text-right">Jump</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-1.5 pl-4 pr-2">{r.origin_terminal_code} <span className="text-text-muted">@ {aUEC(r.price_origin)}</span></td>
                  <td className="pr-2">{r.destination_terminal_code} <span className="text-text-muted">@ {aUEC(r.price_destination)}</span></td>
                  <td className="pr-4 text-right font-mono text-success mfd-readout">{aUEC(r.profit)}</td>
                  <td className="pr-4 text-right font-mono">{r.price_roi ? `${r.price_roi.toFixed(1)}%` : "—"}</td>
                  <td className="pr-4 text-right text-text-secondary">{r.distance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </MfdPanel>
      )}
    </div>
  );
}
