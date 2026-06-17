"use client";

import { useState, useMemo } from "react";
import { MfdPanel } from "@/components/ui/mfd";
import { aUEC } from "@/components/sc-tools/ui";
import type { Commodity, TradeRoute } from "@/lib/uex/queries";

// ---------------------------------------------------------------------------
// Route Planner — client component for interactive filtering of pre-fetched
// trade route data. All filtering is done client-side; no extra network calls.
// ---------------------------------------------------------------------------

interface RoutePlannerProps {
  commodities: Commodity[];
  allRoutes: TradeRoute[];
}

type PlannerMode = "commodity" | "terminals";

export function RoutePlanner({ commodities, allRoutes }: RoutePlannerProps) {
  const [mode, setMode] = useState<PlannerMode>("commodity");
  const [commodityId, setCommodityId] = useState<string>("");
  const [originFilter, setOriginFilter] = useState<string>("");
  const [destFilter, setDestFilter] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  const buyable = useMemo(
    () => commodities.filter((c) => c.is_buyable && c.is_sellable).sort((a, b) => a.name.localeCompare(b.name)),
    [commodities],
  );

  const results = useMemo(() => {
    if (!submitted) return null;

    let filtered = allRoutes;

    if (mode === "commodity" && commodityId) {
      const id = Number(commodityId);
      filtered = filtered.filter((r) => {
        // TradeRoute doesn't carry id_commodity — match by name using commodity list
        const comm = commodities.find((c) => c.id === id);
        return comm ? r.commodity_name === comm.name : true;
      });
    }

    if (mode === "terminals") {
      const orig = originFilter.trim().toLowerCase();
      const dest = destFilter.trim().toLowerCase();
      if (orig) {
        filtered = filtered.filter(
          (r) =>
            r.origin_terminal_name.toLowerCase().includes(orig) ||
            r.origin_terminal_code.toLowerCase().includes(orig),
        );
      }
      if (dest) {
        filtered = filtered.filter(
          (r) =>
            r.destination_terminal_name.toLowerCase().includes(dest) ||
            r.destination_terminal_code.toLowerCase().includes(dest),
        );
      }
    }

    return [...filtered].sort((a, b) => b.profit - a.profit).slice(0, 60);
  }, [submitted, mode, commodityId, originFilter, destFilter, allRoutes, commodities]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  function handleModeChange(m: PlannerMode) {
    setMode(m);
    setSubmitted(false);
    setCommodityId("");
    setOriginFilter("");
    setDestFilter("");
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <nav className="flex gap-3 text-sm">
        {(["commodity", "terminals"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={
              m === mode
                ? "font-bold text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }
          >
            {m === "commodity" ? "By Commodity" : "By Terminal"}
          </button>
        ))}
      </nav>

      {/* Filter form */}
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        {mode === "commodity" ? (
          <div className="flex flex-col gap-1">
            <label className="mfd-label" htmlFor="planner-commodity">
              Commodity
            </label>
            <select
              id="planner-commodity"
              value={commodityId}
              onChange={(e) => setCommodityId(e.target.value)}
              className="rounded border border-border-light bg-surface p-2 text-sm min-w-[180px]"
            >
              <option value="">— Any —</option>
              {buyable.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label className="mfd-label" htmlFor="planner-origin">
                Origin terminal
              </label>
              <input
                id="planner-origin"
                type="text"
                placeholder="e.g. TDD, Port Tressler"
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="rounded border border-border-light bg-surface p-2 text-sm w-48"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="mfd-label" htmlFor="planner-dest">
                Destination terminal
              </label>
              <input
                id="planner-dest"
                type="text"
                placeholder="e.g. GH, Grimhex"
                value={destFilter}
                onChange={(e) => setDestFilter(e.target.value)}
                className="rounded border border-border-light bg-surface p-2 text-sm w-48"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream hover:bg-primary-hover"
        >
          Find Routes
        </button>
      </form>

      {/* Results */}
      {results !== null &&
        (results.length === 0 ? (
          <p className="text-sm text-text-muted">
            No profitable routes match your filters.
          </p>
        ) : (
          <MfdPanel
            title={
              <span>[ PLANNER RESULTS — {results.length} routes ]</span>
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
                  <th className="mfd-label py-2 pr-3 text-right">
                    Profit/SCU
                  </th>
                  <th className="mfd-label py-2 pr-3 text-right">ROI</th>
                  <th className="mfd-label py-2 pr-4 text-right">Jump</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
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
        ))}
    </div>
  );
}
