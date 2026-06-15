import { getVehicles, getVehiclePrices } from "@/lib/uex/queries";
import { UexNotice, aUEC, safeUex } from "@/components/sc-tools/ui";

export default async function LoadoutsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const vehicles = await safeUex(getVehicles);
  if (!vehicles.ok) return <Main><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></Main>;

  const selectedId = id ? Number(id) : undefined;
  const ship = vehicles.data.find((v) => v.id === selectedId);

  if (!ship) {
    return (
      <Main>
        <p className="text-sm text-neutral-400">
          Pick a ship from the <a href="/sc-tools/hangar" className="underline hover:text-neutral-200">Hangar</a> to see its specs and where to buy or rent it.
        </p>
      </Main>
    );
  }

  const prices = await safeUex(() => getVehiclePrices(ship.id));
  const rows = prices.ok ? prices.data : [];

  return (
    <Main>
      <div className="rounded border border-neutral-800 p-4">
        <h2 className="text-lg font-semibold">{ship.name_full ?? ship.name}</h2>
        <p className="mt-1 text-sm text-neutral-400">
          {ship.company_name ?? "—"}
          {ship.scu ? ` · ${ship.scu} SCU cargo` : ""}
          {ship.crew ? ` · crew ${ship.crew}` : ""}
          {ship.mass ? ` · ${ship.mass.toLocaleString()} kg` : ""}
        </p>
        {ship.url_store && <a href={ship.url_store} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline text-neutral-400 hover:text-neutral-200">Pledge store ↗</a>}
      </div>

      <h3 className="text-sm font-semibold text-neutral-300">Buy / rent locations</h3>
      {!prices.ok ? (
        <UexNotice>Couldn&apos;t load prices for this ship.</UexNotice>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No in-game purchase locations reported (may be pledge-only).</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-500">
            <tr><th className="py-1">Terminal</th><th>Location</th><th className="text-right">Buy</th><th className="text-right">Rent</th></tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={i} className="border-t border-neutral-900">
                <td className="py-1 pr-2">{p.terminal_name}</td>
                <td className="pr-2 text-neutral-400">{[p.planet_name, p.star_system_name].filter(Boolean).join(", ")}</td>
                <td className="text-right font-mono">{p.price_buy ? aUEC(p.price_buy) : "—"}</td>
                <td className="text-right font-mono text-sky-300">{p.price_rent ? aUEC(p.price_rent) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl space-y-4 p-6"><h1 className="text-2xl font-bold">Ship Prices</h1>{children}</main>;
}
