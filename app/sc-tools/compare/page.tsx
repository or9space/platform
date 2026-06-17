import { getCommodities, getCommodityPrices } from "@/lib/uex/queries";
import { UexNotice, aUEC, safeUex } from "@/components/sc-tools/ui";
import { Picker } from "../prices/page";
import { ArrowRightLeft } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const commodities = await safeUex(getCommodities);
  if (!commodities.ok) {
    return <div className="p-3 sm:p-6"><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></div>;
  }
  const list = commodities.data.filter((c) => c.is_sellable || c.is_buyable).sort((a, b) => a.name.localeCompare(b.name));
  const selectedId = id ? Number(id) : list[0]?.id;
  const selected = list.find((c) => c.id === selectedId);

  const prices = selectedId ? await safeUex(() => getCommodityPrices(selectedId)) : { ok: true as const, data: [] };
  const rows = prices.ok ? prices.data : [];
  const buys = rows.filter((p) => p.price_buy > 0).sort((a, b) => a.price_buy - b.price_buy);
  const sells = rows.filter((p) => p.price_sell > 0).sort((a, b) => b.price_sell - a.price_sell);
  const bestBuy = buys[0];
  const bestSell = sells[0];
  const spread = bestBuy && bestSell ? bestSell.price_sell - bestBuy.price_buy : null;

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <ArrowRightLeft className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">PRICE COMPARE</h1>
          <p className="text-sm text-text-muted">Best place to buy vs. best place to sell — the spread at a glance.</p>
        </div>
      </div>
      <Picker list={list} selectedId={selectedId} />
      {selected && <h2 className="text-lg font-semibold">{selected.name}</h2>}
      {!prices.ok ? (
        <UexNotice>Couldn&apos;t load prices.</UexNotice>
      ) : (
        <MfdPanel title={<span>[ COMPARE ]</span>} chassis="amber">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card title="Cheapest to buy" tone="sky" p={bestBuy} field="buy" />
            <Card title="Best to sell" tone="emerald" p={bestSell} field="sell" />
            {spread !== null && (
              <div className="sm:col-span-2 mfd-cut-tl-br border border-border p-4">
                <p className="mfd-label">Spread (sell − buy)</p>
                <p className={`text-2xl font-bold font-mono mfd-readout ${spread > 0 ? "text-success" : "text-fg-red-light"}`}>{aUEC(spread)} / SCU</p>
              </div>
            )}
          </div>
        </MfdPanel>
      )}
    </div>
  );
}

function Card({ title, tone, p, field }: {
  title: string; tone: "sky" | "emerald";
  p: { terminal_name: string; planet_name: string | null; star_system_name: string | null; price_buy: number; price_sell: number } | undefined;
  field: "buy" | "sell";
}) {
  const color = tone === "sky" ? "text-info" : "text-success";
  return (
    <div className="mfd-cut-tl-br border border-border p-4">
      <p className="mfd-label">{title}</p>
      {p ? (
        <>
          <p className={`text-2xl font-bold font-mono mfd-readout ${color}`}>{aUEC(field === "buy" ? p.price_buy : p.price_sell)}</p>
          <p className="mt-1 text-sm text-text-secondary">{p.terminal_name}</p>
          <p className="text-xs text-text-muted">{[p.planet_name, p.star_system_name].filter(Boolean).join(", ")}</p>
        </>
      ) : <p className="mt-1 text-sm text-text-muted">No data.</p>}
    </div>
  );
}
