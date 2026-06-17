"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft, Check, Copy, ExternalLink, Rocket, Search, X } from "lucide-react";
import { MfdPanel, MfdReadout } from "@/components/ui/mfd";
import type { Vehicle } from "@/lib/uex/queries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(v: number | string | null | undefined, suffix = ""): string {
  if (v == null || v === 0 || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (isNaN(n)) return String(v);
  return `${n.toLocaleString("en-US")}${suffix ? " " + suffix : ""}`;
}

function compareBest(
  values: (number | null)[],
  higherIsBetter: boolean,
): boolean[] {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length < 2) return values.map(() => false);
  const best = higherIsBetter ? Math.max(...valid) : Math.min(...valid);
  const allSame = valid.every((v) => v === best);
  if (allSame) return values.map(() => false);
  return values.map((v) => v === best);
}

function compareWorst(
  values: (number | null)[],
  higherIsBetter: boolean,
): boolean[] {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length < 2) return values.map(() => false);
  const worst = higherIsBetter ? Math.min(...valid) : Math.max(...valid);
  const allSame = valid.every((v) => v === valid[0]);
  if (allSame) return values.map(() => false);
  return values.map((v) => v === worst);
}

function cellTone(best: boolean, worst: boolean): string {
  if (best) return "text-success";
  if (worst) return "text-fg-red-light";
  return "text-text-primary";
}

function numericVal(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return isNaN(n) || n === 0 ? null : n;
}

// ---------------------------------------------------------------------------
// Ship Selector Combobox
// ---------------------------------------------------------------------------

interface ShipSelectorProps {
  ships: Vehicle[];
  selected: Vehicle | null;
  onSelect: (ship: Vehicle | null) => void;
  label: string;
}

function ShipSelector({ ships, selected, onSelect, label }: ShipSelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const filtered = query.trim()
    ? ships.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          (s.name_full ?? "").toLowerCase().includes(query.toLowerCase()) ||
          (s.company_name ?? "").toLowerCase().includes(query.toLowerCase()),
      )
    : ships;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor={inputId} className="mb-1 block text-xs font-medium mfd-label">
        {label}
      </label>

      {selected ? (
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery("");
            setOpen(true);
          }}
          className="flex w-full items-center gap-2 rounded border border-border bg-surface px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover transition-colors mfd-cut-tl-br"
        >
          <span className="flex-1 truncate">
            {selected.name}
            {selected.company_name && (
              <span className="ml-1 text-text-muted">({selected.company_name})</span>
            )}
          </span>
          <X className="h-4 w-4 shrink-0 text-text-muted" />
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search ships..."
            className="w-full rounded border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      )}

      {open && !selected && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded border border-border bg-surface shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-muted">No ships found</li>
          ) : (
            filtered.slice(0, 100).map((ship) => (
              <li key={ship.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(ship);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover transition-colors"
                >
                  <span className="text-text-primary">{ship.name}</span>
                  {ship.company_name && (
                    <span className="text-text-muted text-xs">({ship.company_name})</span>
                  )}
                  {ship.is_cargo === 1 && (
                    <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                      CARGO
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Table helpers
// ---------------------------------------------------------------------------

function SectionRow({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="pt-5 pb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted/70 mfd-label"
      >
        {label}
      </td>
    </tr>
  );
}

function StatRow({
  label,
  cells,
}: {
  label: string;
  cells: React.ReactNode[];
}) {
  return (
    <tr className="border-b border-border/40 last:border-b-0">
      <td className="py-3 pr-4 text-xs font-medium text-text-muted whitespace-nowrap w-28">
        {label}
      </td>
      {cells.map((cell, i) => (
        <td key={i} className="py-3 px-3 text-sm text-center">
          {cell}
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

export interface ShipCompareClientProps {
  ships: Vehicle[];
}

export function ShipCompareClient({ ships }: ShipCompareClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [shipA, setShipA] = useState<Vehicle | null>(null);
  const [shipB, setShipB] = useState<Vehicle | null>(null);
  const [shipC, setShipC] = useState<Vehicle | null>(null);
  const [copied, setCopied] = useState(false);

  // Hydrate from URL once
  useEffect(() => {
    if (ships.length === 0) return;
    const a = searchParams.get("a");
    const b = searchParams.get("b");
    const c = searchParams.get("c");
    const find = (id: string | null) =>
      id ? (ships.find((s) => s.id === Number(id)) ?? null) : null;
    setShipA(find(a));
    setShipB(find(b));
    setShipC(find(c));
  }, [ships]);

  const pushUrl = useCallback(
    (a: Vehicle | null, b: Vehicle | null, c: Vehicle | null) => {
      const p = new URLSearchParams();
      if (a) p.set("a", String(a.id));
      if (b) p.set("b", String(b.id));
      if (c) p.set("c", String(c.id));
      const qs = p.toString();
      router.replace(qs ? `?${qs}` : "/sc-tools/compare", { scroll: false });
    },
    [router],
  );

  function selectA(s: Vehicle | null) { setShipA(s); pushUrl(s, shipB, shipC); }
  function selectB(s: Vehicle | null) { setShipB(s); pushUrl(shipA, s, shipC); }
  function selectC(s: Vehicle | null) { setShipC(s); pushUrl(shipA, shipB, s); }

  function handleSwap() {
    setShipA(shipB);
    setShipB(shipA);
    pushUrl(shipB, shipA, shipC);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const active = [shipA, shipB, shipC].filter((s): s is Vehicle => s !== null);
  const hasComparison = active.length >= 2;
  const colSpan = active.length + 1;

  // Numeric arrays for comparison highlights
  const scuVals = active.map((s) => numericVal(s.scu));
  const crewVals = active.map((s) => numericVal(s.crew));
  const massVals = active.map((s) => numericVal(s.mass));

  const scuBest = compareBest(scuVals, true);
  const scuWorst = compareWorst(scuVals, true);
  const crewBest = compareBest(crewVals, true);
  const crewWorst = compareWorst(crewVals, true);
  const massBest = compareBest(massVals, false);
  const massWorst = compareWorst(massVals, false);

  return (
    <div className="space-y-6">
      {/* Ship pickers */}
      <MfdPanel title={<span>[ SHIP SELECTION ]</span>} chassis="neutral" bodyPadding="md">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_1fr]">
          <ShipSelector ships={ships} selected={shipA} onSelect={selectA} label="Ship 1" />

          <button
            type="button"
            onClick={handleSwap}
            disabled={!shipA && !shipB}
            title="Swap Ship 1 & 2"
            className="hidden self-end rounded border border-border bg-surface p-2 text-text-muted hover:bg-surface-hover hover:text-primary disabled:opacity-30 transition-colors sm:flex items-center justify-center mfd-cut-tl-br"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>

          <ShipSelector ships={ships} selected={shipB} onSelect={selectB} label="Ship 2" />
          <ShipSelector ships={ships} selected={shipC} onSelect={selectC} label="Ship 3 (optional)" />
        </div>
      </MfdPanel>

      {/* Copy link */}
      {hasComparison && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-2 rounded border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover transition-colors mfd-cut-tl-br"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Link
              </>
            )}
          </button>
        </div>
      )}

      {/* Comparison table */}
      {hasComparison ? (
        <MfdPanel title={<span>[ COMPARISON ]</span>} chassis="amber" bodyPadding="none">
          {/* Ship header cards */}
          <div
            className="grid gap-3 p-4 border-b border-border/60"
            style={{ gridTemplateColumns: `repeat(${active.length}, minmax(0, 1fr))` }}
          >
            {active.map((ship) => (
              <div
                key={ship.id}
                className="flex flex-col items-center justify-center gap-2 rounded border border-border bg-surface-elevated p-4 mfd-cut-tl-br"
              >
                <Rocket className="h-8 w-8 text-primary opacity-60" />
                <div className="text-center">
                  <p className="text-sm font-bold text-fg-cream">{ship.name}</p>
                  {ship.company_name && (
                    <p className="text-xs mfd-label">{ship.company_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Stats table */}
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full min-w-[480px]">
              <tbody>
                <SectionRow label="Identity" colSpan={colSpan} />
                <StatRow
                  label="Manufacturer"
                  cells={active.map((s) => (
                    <span key={s.id} className="text-text-primary">
                      {s.company_name ?? "—"}
                    </span>
                  ))}
                />
                <StatRow
                  label="Full Name"
                  cells={active.map((s) => (
                    <span key={s.id} className="text-xs text-text-secondary">
                      {s.name_full ?? s.name}
                    </span>
                  ))}
                />
                <StatRow
                  label="Type"
                  cells={active.map((s) => (
                    <span
                      key={s.id}
                      className={s.is_spaceship === 1 ? "text-primary" : "text-text-muted"}
                    >
                      {s.is_spaceship === 1 ? "Spaceship" : "Ground Vehicle"}
                    </span>
                  ))}
                />
                <StatRow
                  label="Cargo"
                  cells={active.map((s) => (
                    <span
                      key={s.id}
                      className={s.is_cargo === 1 ? "text-success" : "text-text-muted"}
                    >
                      {s.is_cargo === 1 ? "Yes" : "No"}
                    </span>
                  ))}
                />

                <SectionRow label="Stats" colSpan={colSpan} />
                <StatRow
                  label="Cargo (SCU)"
                  cells={active.map((s, i) => (
                    <span key={s.id} className={cellTone(scuBest[i], scuWorst[i])}>
                      {fmt(s.scu, "SCU")}
                    </span>
                  ))}
                />
                <StatRow
                  label="Crew"
                  cells={active.map((s, i) => (
                    <span key={s.id} className={cellTone(crewBest[i], crewWorst[i])}>
                      {fmt(s.crew)}
                    </span>
                  ))}
                />
                <StatRow
                  label="Mass (kg)"
                  cells={active.map((s, i) => (
                    <span key={s.id} className={cellTone(massBest[i], massWorst[i])}>
                      {s.mass ? s.mass.toLocaleString("en-US") + " kg" : "—"}
                    </span>
                  ))}
                />

                <SectionRow label="Links" colSpan={colSpan} />
                <StatRow
                  label="Store Page"
                  cells={active.map((s) =>
                    s.url_store ? (
                      <a
                        key={s.id}
                        href={s.url_store}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        RSI Store <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span key={s.id} className="text-text-muted">—</span>
                    ),
                  )}
                />
              </tbody>
            </table>
          </div>

          {/* Quick readout summary row */}
          <div className="grid gap-3 border-t border-border/60 p-4 sm:grid-cols-3">
            {active.map((s) => (
              <div key={s.id} className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mfd-label">
                  {s.name}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <MfdReadout label="SCU" value={fmt(s.scu)} tone="amber" size="sm" />
                  <MfdReadout label="Crew" value={fmt(s.crew)} tone="amber" size="sm" />
                  {s.mass != null && s.mass > 0 && (
                    <MfdReadout
                      label="Mass"
                      value={s.mass.toLocaleString("en-US")}
                      tone="muted"
                      size="sm"
                      aside="kg"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </MfdPanel>
      ) : (
        /* Empty state */
        <MfdPanel chassis="neutral" bodyPadding="lg">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ArrowRightLeft className="mb-4 h-10 w-10 text-text-muted opacity-25" />
            <p className="text-base font-semibold text-text-secondary">
              Select at least two ships to compare
            </p>
            <p className="mt-1 text-sm mfd-label">
              Use the selectors above to pick ships for side-by-side comparison.
            </p>
          </div>
        </MfdPanel>
      )}
    </div>
  );
}
