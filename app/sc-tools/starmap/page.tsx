import { getStarSystems, getPlanets, type Planet } from "@/lib/uex/queries";
import { UexNotice, safeUex } from "@/components/sc-tools/ui";
import { Globe } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";

export default async function StarMapPage() {
  const [systems, planets] = await Promise.all([safeUex(getStarSystems), safeUex(getPlanets)]);
  if (!systems.ok) return <div className="p-3 sm:p-6"><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></div>;

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
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={Globe} title="Star Map" subtitle="Systems, planets and moons of the 'verse." />
      <MfdPanel title={<span>[ STAR MAP ]</span>} chassis="neutral" bodyPadding="sm">
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((s) => {
            const ps = (byId.get(s.id) ?? []).sort((a, b) => a.name.localeCompare(b.name));
            return (
              <section key={s.id} className="mfd-cut-tl-br border border-border p-4">
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
      </MfdPanel>
    </div>
  );
}
