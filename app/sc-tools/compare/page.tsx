import { getCommodities, getCommodityPrices } from "@/lib/uex/queries";
import { UexNotice, aUEC, safeUex } from "@/components/sc-tools/ui";
import { Picker } from "../prices/page";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const commodities = await safeUex(getCommodities);
  if (!commodities.ok) {
    return <Main><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></Main>;
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
    <Main>
      <Picker list={list} selectedId={selectedId} />
      {selected && <h2 className="text-lg font-semibold">{selected.name}</h2>}
      {!prices.ok ? (
        <UexNotice>Couldn&apos;t load prices.</UexNotice>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title="Cheapest to buy" tone="sky" p={bestBuy} field="buy" />
          <Card title="Best to sell" tone="emerald" p={bestSell} field="sell" />
          {spread !== null && (
            <div className="sm:col-span-2 rounded border border-neutral-800 p-4">
              <p className="text-sm text-neutral-400">Spread (sell − buy)</p>
              <p className={`text-2xl font-bold ${spread > 0 ? "text-emerald-300" : "text-red-300"}`}>{aUEC(spread)} / SCU</p>
            </div>
          )}
        </div>
      )}
    </Main>
  );
}

function Card({ title, tone, p, field }: {
  title: string; tone: "sky" | "emerald";
  p: { terminal_name: string; planet_name: string | null; star_system_name: string | null; price_buy: number; price_sell: number } | undefined;
  field: "buy" | "sell";
}) {
  const color = tone === "sky" ? "text-sky-300" : "text-emerald-300";
  return (
    <div className="rounded border border-neutral-800 p-4">
      <p className="text-sm text-neutral-400">{title}</p>
      {p ? (
        <>
          <p className={`text-2xl font-bold ${color}`}>{aUEC(field === "buy" ? p.price_buy : p.price_sell)}</p>
          <p className="mt-1 text-sm text-neutral-300">{p.terminal_name}</p>
          <p className="text-xs text-neutral-500">{[p.planet_name, p.star_system_name].filter(Boolean).join(", ")}</p>
        </>
      ) : <p className="mt-1 text-sm text-neutral-500">No data.</p>}
    </div>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl space-y-4 p-6"><h1 className="text-2xl font-bold">Price Compare</h1>{children}</main>;
}
