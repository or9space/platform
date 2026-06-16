import { getStarSystems, getPlanets, type Planet } from "@/lib/uex/queries";
import { UexNotice, safeUex } from "@/components/sc-tools/ui";

export default async function StarMapPage() {
  const [systems, planets] = await Promise.all([safeUex(getStarSystems), safeUex(getPlanets)]);
  if (!systems.ok) return <Main><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></Main>;

  const byId = new Map<number, Planet[]>();
  if (planets.ok) {
    for (const p of planets.data) {
      const arr = byId.get(p.id_star_system) ?? [];
      if (arr.length === 0) byId.set(p.id_star_system, arr);
      arr.push(p);
    }
  }

  const list = [...systems.data].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Main>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((s) => {
          const ps = (byId.get(s.id) ?? []).sort((a, b) => a.name.localeCompare(b.name));
          return (
            <section key={s.id} className="rounded border border-border p-4">
              <h2 className="font-semibold text-text-primary">{s.name} <span className="text-xs text-text-muted">{s.code}</span></h2>
              {ps.length === 0 ? (
                <p className="mt-1 text-xs text-text-muted">No planets listed.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {ps.map((p) => (
                    <li key={p.id} className="rounded bg-surface px-2 py-0.5 text-xs text-text-secondary">{p.name}</li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-4xl space-y-4 p-6"><h1 className="text-2xl font-bold">Star Map</h1>{children}</main>;
}
