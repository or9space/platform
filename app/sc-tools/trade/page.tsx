import { getCommodities, getTradeRoutes, type Commodity, type TradeRoute } from "@/lib/uex/queries";
import { UexNotice, aUEC, safeUex } from "@/components/sc-tools/ui";
import { RoutePlanner } from "@/components/sc-tools/trade-client";
import { TrendingUp } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "routes" | "rankings" | "planner";

const TABS: { id: Tab; label: string }[] = [
  { id: "routes", label: "Best Routes" },
  { id: "rankings", label: "Commodity Rankings" },
  { id: "planner", label: "Route Planner" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TradePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; id?: string }>;
}) {
  const { tab: rawTab, id } = await searchParams;
  const tab: Tab =
    rawTab === "rankings" ? "rankings" : rawTab === "planner" ? "planner" : "routes";

  // Always fetch commodities — needed for all three tabs.
  const commoditiesResult = await safeUex(getCommodities);
  if (!commoditiesResult.ok) {
    return (
      <div className="p-3 sm:p-6">
        <UexNotice>Couldn&apos;t reach UEX right now. Try again shortly.</UexNotice>
      </div>
    );
  }
  const commodities = commoditiesResult.data;

  // Fetch routes — used by "Best Routes" and "Route Planner".
  const routesResult = await safeUex(() => getTradeRoutes());
  const allRoutes = routesResult.ok ? routesResult.data : [];

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="Trade Routes"
        subtitle="Most profitable hauls right now, ranked by profit and ROI."
      />

      {/* Tab nav — URL-driven, no client JS needed */}
      <nav className="flex gap-4 text-sm border-b border-border pb-2">
        {TABS.map(({ id: tid, label }) => (
          <a
            key={tid}
            href={`/sc-tools/trade?tab=${tid}`}
            className={
              tab === tid
                ? "font-bold text-text-primary border-b-2 border-primary pb-1"
                : "text-text-secondary hover:text-text-primary pb-1"
            }
          >
            {label}
          </a>
        ))}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* TAB: Best Routes                                                    */}
      {/* ------------------------------------------------------------------ */}
      {tab === "routes" && (
        <BestRoutesTab allRoutes={allRoutes} routesOk={routesResult.ok} id={id} commodities={commodities} />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: Commodity Rankings                                             */}
      {/* ------------------------------------------------------------------ */}
      {tab === "rankings" && (
        <CommodityRankingsTab commodities={commodities} allRoutes={allRoutes} />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: Route Planner                                                  */}
      {/* ------------------------------------------------------------------ */}
      {tab === "planner" && (
        routesResult.ok ? (
          <RoutePlanner commodities={commodities} allRoutes={allRoutes} />
        ) : (
          <UexNotice>Route data unavailable — planner requires live UEX data.</UexNotice>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Best Routes tab — per-commodity list, commodity picker, sorted by profit
// ---------------------------------------------------------------------------

function BestRoutesTab({
  allRoutes,
  routesOk,
  id,
  commodities,
}: {
  allRoutes: TradeRoute[];
  routesOk: boolean;
  id?: string;
  commodities: Commodity[];
}) {
  if (!routesOk) {
    return <UexNotice>Couldn&apos;t load trade routes from UEX.</UexNotice>;
  }

  // Build commodity picker list — only commodities that appear in routes
  const tradeComms = commodities
    .filter((c) => c.is_buyable && c.is_sellable)
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedId = id ? Number(id) : null;
  const selected = selectedId ? tradeComms.find((c) => c.id === selectedId) : null;

  // Filter routes to selected commodity (by name match since TradeRoute has commodity_name)
  const rows = (
    selected
      ? allRoutes.filter((r) => r.commodity_name === selected.name)
      : allRoutes
  )
    .slice()
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 80);

  return (
    <div className="space-y-4">
      {/* Commodity filter */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="tab" value="routes" />
        <div className="flex flex-col gap-1">
          <label className="mfd-label" htmlFor="routes-commodity">
            Filter by commodity
          </label>
          <select
            id="routes-commodity"
            name="id"
            defaultValue={selectedId ?? ""}
            className="rounded border border-border-light bg-surface p-2 text-sm min-w-[180px]"
          >
            <option value="">— All commodities —</option>
            {tradeComms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-primary px-3 py-2 text-sm font-semibold text-fg-cream hover:bg-primary-hover"
        >
          Filter
        </button>
        {selected && (
          <a
            href="/sc-tools/trade?tab=routes"
            className="self-end text-xs text-text-secondary underline hover:text-text-primary"
          >
            Clear
          </a>
        )}
      </form>

      {selected && (
        <p className="mfd-label">
          Showing routes for <span className="text-text-primary font-semibold">{selected.name}</span>
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">No profitable routes found.</p>
      ) : (
        <MfdPanel
          title={
            <span>
              [ BEST ROUTES{selected ? ` — ${selected.name.toUpperCase()}` : ""} —{" "}
              {rows.length} shown ]
            </span>
          }
          chassis="amber"
          bodyPadding="none"
        >
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className="mfd-label py-2 pl-4 pr-2">Commodity</th>
                <th className="mfd-label py-2 pr-2">Buy at</th>
                <th className="mfd-label py-2 pr-2">Sell at</th>
                <th className="mfd-label py-2 pr-3 text-right">Profit/SCU</th>
                <th className="mfd-label py-2 pr-3 text-right">ROI</th>
                <th className="mfd-label py-2 pr-4 text-right">Jump</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-1.5 pl-4 pr-2">{r.commodity_name}</td>
                  <td className="pr-2">
                    {r.origin_terminal_name}
                    <span className="ml-1 text-text-muted">
                      @ {aUEC(r.price_origin)}
                    </span>
                  </td>
                  <td className="pr-2">
                    {r.destination_terminal_name}
                    <span className="ml-1 text-text-muted">
                      @ {aUEC(r.price_destination)}
                    </span>
                  </td>
                  <td className="mfd-readout pr-3 text-right font-mono text-success">
                    {aUEC(r.profit)}
                  </td>
                  <td className="pr-3 text-right font-mono">
                    {r.price_roi ? `${r.price_roi.toFixed(1)}%` : "—"}
                  </td>
                  <td className="pr-4 text-right text-text-secondary">
                    {r.distance ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </MfdPanel>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Commodity Rankings tab — sorted by best margin (price_sell - price_buy)
// using the Commodity base prices, with best route profit overlaid where
// route data is available.
// ---------------------------------------------------------------------------

function CommodityRankingsTab({
  commodities,
  allRoutes,
}: {
  commodities: Commodity[];
  allRoutes: TradeRoute[];
}) {
  // Build a quick map: commodity_name → best profit from live routes
  const bestRouteProfit = new Map<string, { profit: number; roi: number }>();
  for (const r of allRoutes) {
    const existing = bestRouteProfit.get(r.commodity_name);
    if (!existing || r.profit > existing.profit) {
      bestRouteProfit.set(r.commodity_name, { profit: r.profit, roi: r.price_roi });
    }
  }

  // Rank tradeable commodities by margin (sell - buy base price), then overlay
  // live route profit where available.
  const ranked = commodities
    .filter((c) => c.is_buyable && c.is_sellable && c.price_sell > 0 && c.price_buy > 0)
    .map((c) => {
      const baseMargin = c.price_sell - c.price_buy;
      const baseRoi =
        c.price_buy > 0 ? (baseMargin / c.price_buy) * 100 : 0;
      const live = bestRouteProfit.get(c.name);
      return {
        ...c,
        baseMargin,
        baseRoi,
        liveProfit: live?.profit ?? null,
        liveRoi: live?.roi ?? null,
      };
    })
    .sort((a, b) => {
      // Sort by live profit if available, else base margin
      const ap = a.liveProfit ?? a.baseMargin;
      const bp = b.liveProfit ?? b.baseMargin;
      return bp - ap;
    });

  if (ranked.length === 0) {
    return (
      <p className="text-sm text-text-muted">No commodity rankings available.</p>
    );
  }

  return (
    <MfdPanel
      title={<span>[ COMMODITY RANKINGS — {ranked.length} commodities ]</span>}
      chassis="amber"
      bodyPadding="none"
    >
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr>
            <th className="mfd-label py-2 pl-4 pr-1">#</th>
            <th className="mfd-label py-2 pr-2">Commodity</th>
            <th className="mfd-label py-2 pr-3 text-right">Base buy</th>
            <th className="mfd-label py-2 pr-3 text-right">Base sell</th>
            <th className="mfd-label py-2 pr-3 text-right">Base margin</th>
            <th className="mfd-label py-2 pr-3 text-right">Live best profit</th>
            <th className="mfd-label py-2 pr-4 text-right">Live ROI</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((c, i) => (
            <tr key={c.id} className="border-t border-border">
              <td className="py-1.5 pl-4 pr-1 text-text-muted font-mono text-xs">
                {i + 1}
              </td>
              <td className="pr-2">
                {c.name}
                {c.is_illegal ? (
                  <span className="ml-2 text-xs text-fg-red-light">illegal</span>
                ) : null}
                {c.is_mineral ? (
                  <span className="ml-1 text-xs text-text-muted">mineral</span>
                ) : null}
              </td>
              <td className="pr-3 text-right font-mono text-text-secondary">
                {aUEC(c.price_buy)}
              </td>
              <td className="pr-3 text-right font-mono text-text-secondary">
                {aUEC(c.price_sell)}
              </td>
              <td className="pr-3 text-right font-mono mfd-readout">
                {aUEC(c.baseMargin)}
                <span className="ml-1 text-xs text-text-muted">
                  ({c.baseRoi.toFixed(0)}%)
                </span>
              </td>
              <td className="pr-3 text-right font-mono text-success">
                {c.liveProfit !== null ? aUEC(c.liveProfit) : <span className="text-text-muted">—</span>}
              </td>
              <td className="pr-4 text-right font-mono">
                {c.liveRoi !== null ? (
                  `${c.liveRoi.toFixed(1)}%`
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </MfdPanel>
  );
}
