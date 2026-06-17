import { getVehicles, getVehiclePrices } from "@/lib/uex/queries";
import { UexNotice, aUEC, safeUex } from "@/components/sc-tools/ui";
import { Wrench } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";

export default async function LoadoutsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const vehicles = await safeUex(getVehicles);
  if (!vehicles.ok) return <div className="p-3 sm:p-6"><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></div>;

  const selectedId = id ? Number(id) : undefined;
  const ship = vehicles.data.find((v) => v.id === selectedId);

  if (!ship) {
    return (
      <div className="p-3 sm:p-6 animate-page-enter space-y-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
            <Wrench className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">SHIP PRICES</h1>
            <p className="text-sm text-text-muted">Where to buy or rent a ship, and for how much.</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          Pick a ship from the <a href="/sc-tools/hangar" className="underline hover:text-text-primary">Hangar</a> to see its specs and where to buy or rent it.
        </p>
      </div>
    );
  }

  const prices = await safeUex(() => getVehiclePrices(ship.id));
  const rows = prices.ok ? prices.data : [];

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Wrench className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">SHIP PRICES</h1>
          <p className="text-sm text-text-muted">Where to buy or rent a ship, and for how much.</p>
        </div>
      </div>

      <MfdPanel title={<span>[ SHIP ]</span>} chassis="neutral">
        <h2 className="text-lg font-semibold">{ship.name_full ?? ship.name}</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {ship.company_name ?? "—"}
          {ship.scu ? ` · ${ship.scu} SCU cargo` : ""}
          {ship.crew ? ` · crew ${ship.crew}` : ""}
          {ship.mass ? ` · ${ship.mass.toLocaleString()} kg` : ""}
        </p>
        {ship.url_store && <a href={ship.url_store} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline text-text-secondary hover:text-text-primary">Pledge store ↗</a>}
      </MfdPanel>

      <h3 className="mfd-label">Buy / rent locations</h3>
      {!prices.ok ? (
        <UexNotice>Couldn&apos;t load prices for this ship.</UexNotice>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-muted">No in-game purchase locations reported (may be pledge-only).</p>
      ) : (
        <MfdPanel title={<span>[ LOADOUTS ]</span>} chassis="amber" bodyPadding="none">
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className="mfd-label py-2 pl-4 pr-2">Terminal</th>
                <th className="mfd-label py-2 pr-2">Location</th>
                <th className="mfd-label py-2 pr-4 text-right">Buy</th>
                <th className="mfd-label py-2 pr-4 text-right">Rent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1.5 pl-4 pr-2">{p.terminal_name}</td>
                  <td className="pr-2 text-text-secondary">{[p.planet_name, p.star_system_name].filter(Boolean).join(", ")}</td>
                  <td className="pr-4 text-right font-mono mfd-readout">{p.price_buy ? aUEC(p.price_buy) : "—"}</td>
                  <td className="pr-4 text-right font-mono text-info">{p.price_rent ? aUEC(p.price_rent) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </MfdPanel>
      )}
    </div>
  );
}
