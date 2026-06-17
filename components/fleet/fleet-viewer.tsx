"use client";

import { useState, useMemo } from "react";
import {
  Search,
  LayoutGrid,
  List,
  Rocket,
  ArrowUpDown,
} from "lucide-react";
import type { FleetShipRow } from "@/lib/queries/fleet";
import { MfdPanel } from "@/components/ui/mfd";
import { ModerateDeleteButton } from "@/app/fleet/moderate-delete-button";

type SortKey = "name" | "manufacturer" | "qty";

interface FleetViewerProps {
  ships: FleetShipRow[];
  viewerMembershipId: string;
  canCommand: boolean;
}

export function FleetViewer({
  ships,
  viewerMembershipId,
  canCommand,
}: FleetViewerProps) {
  const [view, setView] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q
      ? ships.filter(
          (s) =>
            s.shipName.toLowerCase().includes(q) ||
            (s.manufacturer ?? "").toLowerCase().includes(q) ||
            s.ownerName.toLowerCase().includes(q),
        )
      : ships;

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "manufacturer":
          return (
            (a.manufacturer ?? "").localeCompare(b.manufacturer ?? "") ||
            a.shipName.localeCompare(b.shipName)
          );
        case "qty":
          return b.quantity - a.quantity;
        case "name":
        default:
          return a.shipName.localeCompare(b.shipName);
      }
    });
  }, [ships, search, sortBy]);

  return (
    <MfdPanel
      chassis="neutral"
      title={<span>[ ORG FLEET ]</span>}
      titleAside={<span className="mfd-label">{ships.length} RECORDS</span>}
      bodyPadding="none"
    >
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search ships, manufacturer, owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border bg-surface pl-9 pr-4 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus-visible:border-primary focus-visible:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-text-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="border border-border bg-surface px-2 py-1.5 text-xs text-text-secondary focus-visible:border-primary focus-visible:outline-none"
            >
              <option value="name">Name A-Z</option>
              <option value="manufacturer">Manufacturer</option>
              <option value="qty">Quantity</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex border border-border">
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 transition-colors ${view === "grid" ? "bg-primary/15 text-primary" : "text-text-muted hover:text-text-secondary"}`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1.5 transition-colors ${view === "list" ? "bg-primary/15 text-primary" : "text-text-muted hover:text-text-secondary"}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {ships.length === 0 ? (
        <p className="px-4 py-6 text-sm text-text-muted">
          No ships in the org fleet yet.
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <Rocket className="mb-3 h-10 w-10 opacity-20" />
          <p className="text-sm">No ships match your search.</p>
        </div>
      ) : view === "list" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left">
                <th className="px-4 py-2 font-normal">
                  <span className="mfd-label">SHIP</span>
                </th>
                <th className="px-4 py-2 font-normal">
                  <span className="mfd-label">MFR</span>
                </th>
                <th className="px-4 py-2 font-normal">
                  <span className="mfd-label">OWNER</span>
                </th>
                <th className="px-4 py-2 font-normal">
                  <span className="mfd-label">QTY</span>
                </th>
                {canCommand && (
                  <th className="px-4 py-2 font-normal"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ship) => {
                const isOwn = ship.ownerMembershipId === viewerMembershipId;
                return (
                  <tr
                    key={ship.id}
                    className="border-b border-border/40 hover:bg-primary/5 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {ship.imageUrl &&
                          ship.imageUrl.startsWith("http") && (
                            <img
                              src={ship.imageUrl}
                              alt={ship.shipName}
                              className="h-8 w-12 shrink-0 object-cover"
                            />
                          )}
                        <div>
                          <span className="font-medium text-text-primary">
                            {ship.shipName}
                          </span>
                          {!ship.isPublic && isOwn && (
                            <span className="ml-2 rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-text-muted">
                              PRIVATE
                            </span>
                          )}
                          {ship.notes && (
                            <p className="mt-0.5 text-xs text-text-muted whitespace-pre-wrap">
                              {ship.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {ship.manufacturer ?? (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {ship.ownerName}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-amber">
                      {ship.quantity}
                    </td>
                    {canCommand && (
                      <td className="px-4 py-2.5">
                        {!isOwn && (
                          <ModerateDeleteButton
                            shipId={ship.id}
                            shipName={ship.shipName}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((ship) => {
            const isOwn = ship.ownerMembershipId === viewerMembershipId;
            return (
              <div
                key={ship.id}
                className="overflow-hidden border border-border bg-surface hover:border-primary/40 transition-colors"
              >
                <div className="relative flex h-36 items-center justify-center overflow-hidden bg-surface-elevated">
                  {ship.imageUrl && ship.imageUrl.startsWith("http") ? (
                    <img
                      src={ship.imageUrl}
                      alt={ship.shipName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Rocket className="h-10 w-10 text-text-muted/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
                  <span className="absolute bottom-2 right-2 bg-primary/90 px-2 py-0.5 text-xs font-bold text-fg-cream">
                    &times;{ship.quantity}
                  </span>
                  {!ship.isPublic && isOwn && (
                    <span className="absolute top-2 left-2 rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-text-muted">
                      PRIVATE
                    </span>
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <div>
                    <h3 className="text-sm font-semibold leading-tight text-text-primary">
                      {ship.shipName}
                    </h3>
                    <p className="text-xs text-text-muted">
                      {ship.manufacturer ?? "—"}
                    </p>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {ship.ownerName}
                  </p>
                  {ship.notes && (
                    <p className="text-xs text-text-muted whitespace-pre-wrap">
                      {ship.notes}
                    </p>
                  )}
                  {canCommand && !isOwn && (
                    <div className="pt-1">
                      <ModerateDeleteButton
                        shipId={ship.id}
                        shipName={ship.shipName}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MfdPanel>
  );
}
