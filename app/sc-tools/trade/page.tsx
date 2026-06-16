import { getCommodities, getTradeRoutes } from "@/lib/uex/queries";
import { UexNotice, aUEC, safeUex } from "@/components/sc-tools/ui";
import { Picker } from "../prices/page";

export default async function TradePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const commodities = await safeUex(getCommodities);
  if (!commodities.ok) return <Main><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></Main>;

  const list = commodities.data.filter((c) => c.is_sellable).sort((a, b) => a.name.localeCompare(b.name));
  const selectedId = id ? Number(id) : list[0]?.id;
  const selected = list.find((c) => c.id === selectedId);

  const routes = selectedId ? await safeUex(() => getTradeRoutes(selectedId)) : { ok: true as const, data: [] };
  const rows = routes.ok ? [...routes.data].sort((a, b) => b.profit - a.profit).slice(0, 50) : [];

  return (
    <Main>
      <Picker list={list} selectedId={selectedId} />
      {selected && <h2 className="text-lg font-semibold">Best routes — {selected.name}</h2>}
      {!routes.ok ? (
        <UexNotice>Couldn&apos;t load routes for this commodity.</UexNotice>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-muted">No profitable routes reported.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-text-muted">
            <tr><th className="py-1">Buy at</th><th>Sell at</th><th className="text-right">Profit/SCU</th><th className="text-right">ROI</th><th className="text-right">Jump</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-1 pr-2">{r.origin_terminal_code} <span className="text-text-muted">@ {aUEC(r.price_origin)}</span></td>
                <td className="pr-2">{r.destination_terminal_code} <span className="text-text-muted">@ {aUEC(r.price_destination)}</span></td>
                <td className="text-right font-mono text-success">{aUEC(r.profit)}</td>
                <td className="text-right font-mono">{r.price_roi ? `${r.price_roi.toFixed(1)}%` : "—"}</td>
                <td className="text-right text-text-secondary">{r.distance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-4xl space-y-4 p-6"><h1 className="text-2xl font-bold">Trade Routes</h1>{children}</main>;
}
