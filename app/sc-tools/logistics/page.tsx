import { getTerminals } from "@/lib/uex/queries";
import { UexNotice, safeUex } from "@/components/sc-tools/ui";

export default async function LogisticsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const terminals = await safeUex(getTerminals);
  if (!terminals.ok) return <Main><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></Main>;

  const query = (q ?? "").trim().toLowerCase();
  const rows = terminals.data
    .filter((t) => !query || `${t.name} ${t.planet_name ?? ""} ${t.star_system_name ?? ""}`.toLowerCase().includes(query));

  // Group by star system.
  const bySystem = new Map<string, typeof rows>();
  for (const t of rows) {
    const sys = t.star_system_name ?? "Unknown";
    const arr = bySystem.get(sys) ?? [];
    if (arr.length === 0) bySystem.set(sys, arr);
    arr.push(t);
  }
  const systems = [...bySystem.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Main>
      <form method="get" className="flex items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Search terminals / locations…" className="w-full rounded border border-border-light bg-surface p-2 text-sm" />
        <button type="submit" className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream">Search</button>
      </form>
      <p className="text-xs text-text-muted">{rows.length} terminals</p>
      {systems.map(([sys, ts]) => (
        <section key={sys} className="space-y-1">
          <h2 className="text-sm font-semibold text-text-primary">{sys}</h2>
          <ul className="divide-y divide-border rounded border border-border">
            {ts.slice(0, 300).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="text-text-primary">{t.name}</span>
                <span className="text-xs text-text-muted">{[t.planet_name, t.type].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl space-y-4 p-6"><h1 className="text-2xl font-bold">Logistics — Terminals</h1>{children}</main>;
}
