import type { FleetShipRow } from "@/lib/queries/fleet";

interface FleetStatsProps {
  ships: FleetShipRow[];
}

export function FleetStats({ ships }: FleetStatsProps) {
  if (ships.length === 0) return null;

  const totalQty = ships.reduce((s, r) => s + r.quantity, 0);
  const uniqueTypes = new Set(ships.map((r) => r.shipName.toLowerCase())).size;

  // Top manufacturers
  const mfrCounts = new Map<string, number>();
  for (const ship of ships) {
    const mfr = ship.manufacturer ?? "Unknown";
    mfrCounts.set(mfr, (mfrCounts.get(mfr) ?? 0) + ship.quantity);
  }
  const topManufacturers = [...mfrCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="rounded-lg border border-border bg-surface p-5 space-y-5">
      <h2 className="text-sm font-semibold text-text-primary uppercase tracking-widest">
        Fleet Composition
      </h2>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Total Ships" value={totalQty} />
        <StatBox label="Unique Types" value={uniqueTypes} />
      </div>

      {/* Top manufacturers */}
      {topManufacturers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Top Manufacturers
          </p>
          <div className="flex flex-wrap gap-2">
            {topManufacturers.map(([mfr, count]) => (
              <span
                key={mfr}
                className="rounded-full border border-border bg-surface-elevated px-2.5 py-0.5 text-xs text-text-secondary"
              >
                {mfr}{" "}
                <span className="text-text-muted">&times;{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-surface-elevated p-3 text-center">
      <p className="text-xl font-bold text-primary">{value}</p>
      <p className="text-[11px] text-text-muted">{label}</p>
    </div>
  );
}
