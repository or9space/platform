import { getCommodities, getCommodityPrices } from "@/lib/uex/queries";
import { UexNotice, aUEC, safeUex } from "@/components/sc-tools/ui";
import { DollarSign } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";

export default async function PricesPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const commodities = await safeUex(getCommodities);
  if (!commodities.ok) return <div className="p-3 sm:p-6"><UexNotice>Couldn&apos;t reach UEX right now. Try again shortly.</UexNotice></div>;

  const list = commodities.data.filter((c) => c.is_sellable || c.is_buyable).sort((a, b) => a.name.localeCompare(b.name));
  const selectedId = id ? Number(id) : list[0]?.id;
  const selected = list.find((c) => c.id === selectedId);

  const prices = selectedId ? await safeUex(() => getCommodityPrices(selectedId)) : { ok: true as const, data: [] };
  const rows = prices.ok ? [...prices.data].sort((a, b) => b.price_sell - a.price_sell) : [];

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <DollarSign className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">COMMODITY PRICES</h1>
          <p className="text-sm text-text-muted">Live buy/sell prices across every terminal.</p>
        </div>
      </div>
      <Picker list={list} selectedId={selectedId} />
      {selected && <h2 className="text-lg font-semibold">{selected.name}</h2>}
      {!prices.ok ? (
        <UexNotice>Couldn&apos;t load prices for this commodity.</UexNotice>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-muted">No terminal prices reported.</p>
      ) : (
        <MfdPanel title={<span>[ PRICES ]</span>} chassis="amber" bodyPadding="none">
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className="mfd-label py-2 pl-4 pr-2">Terminal</th>
                <th className="mfd-label py-2 pr-2">Location</th>
                <th className="mfd-label py-2 pr-4 text-right">Buy</th>
                <th className="mfd-label py-2 pr-4 text-right">Sell</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={`${p.id_terminal}-${i}`} className="border-t border-border">
                  <td className="py-1.5 pl-4 pr-2">{p.terminal_name}</td>
                  <td className="pr-2 text-text-secondary">{[p.planet_name, p.star_system_name].filter(Boolean).join(", ")}</td>
                  <td className="pr-4 text-right font-mono mfd-readout">{p.price_buy ? aUEC(p.price_buy) : "—"}</td>
                  <td className="pr-4 text-right font-mono text-success">{p.price_sell ? aUEC(p.price_sell) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </MfdPanel>
      )}
    </div>
  );
}

export function Picker({ list, selectedId }: { list: { id: number; name: string }[]; selectedId?: number }) {
  return (
    <form method="get" className="flex items-center gap-2">
      <select name="id" defaultValue={selectedId} className="rounded border border-border-light bg-surface p-2 text-sm">
        {list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button type="submit" className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream">View</button>
    </form>
  );
}
