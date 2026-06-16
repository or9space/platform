import { getCommodities, getCommodityPrices } from "@/lib/uex/queries";
import { UexNotice, aUEC, safeUex } from "@/components/sc-tools/ui";

export default async function PricesPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const commodities = await safeUex(getCommodities);
  if (!commodities.ok) return <Main><UexNotice>Couldn&apos;t reach UEX right now. Try again shortly.</UexNotice></Main>;

  const list = commodities.data.filter((c) => c.is_sellable || c.is_buyable).sort((a, b) => a.name.localeCompare(b.name));
  const selectedId = id ? Number(id) : list[0]?.id;
  const selected = list.find((c) => c.id === selectedId);

  const prices = selectedId ? await safeUex(() => getCommodityPrices(selectedId)) : { ok: true as const, data: [] };
  const rows = prices.ok ? [...prices.data].sort((a, b) => b.price_sell - a.price_sell) : [];

  return (
    <Main>
      <Picker list={list} selectedId={selectedId} />
      {selected && <h2 className="text-lg font-semibold">{selected.name}</h2>}
      {!prices.ok ? (
        <UexNotice>Couldn&apos;t load prices for this commodity.</UexNotice>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-muted">No terminal prices reported.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-text-muted">
            <tr><th className="py-1">Terminal</th><th>Location</th><th className="text-right">Buy</th><th className="text-right">Sell</th></tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={`${p.id_terminal}-${i}`} className="border-t border-border">
                <td className="py-1 pr-2">{p.terminal_name}</td>
                <td className="pr-2 text-text-secondary">{[p.planet_name, p.star_system_name].filter(Boolean).join(", ")}</td>
                <td className="text-right font-mono">{p.price_buy ? aUEC(p.price_buy) : "—"}</td>
                <td className="text-right font-mono text-success">{p.price_sell ? aUEC(p.price_sell) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl space-y-4 p-6"><h1 className="text-2xl font-bold">Commodity Prices</h1>{children}</main>;
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
