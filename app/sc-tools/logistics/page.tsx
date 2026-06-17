import { getTerminals } from "@/lib/uex/queries";
import { UexNotice, safeUex } from "@/components/sc-tools/ui";
import { Package } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";

export default async function LogisticsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const terminals = await safeUex(getTerminals);
  if (!terminals.ok) return <div className="p-3 sm:p-6"><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></div>;

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
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Package className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">LOGISTICS</h1>
          <p className="text-sm text-text-muted">Every trade terminal by system and planet.</p>
        </div>
      </div>
      <form method="get" className="flex items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Search terminals / locations…" className="w-full rounded border border-border-light bg-surface p-2 text-sm" />
        <button type="submit" className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream">Search</button>
      </form>
      <p className="text-xs text-text-muted">{rows.length} terminals</p>
      {systems.map(([sys, ts]) => (
        <MfdPanel key={sys} title={<span>[ {sys.toUpperCase()} ]</span>} chassis="neutral" bodyPadding="none">
          <ul className="divide-y divide-border">
            {ts.slice(0, 300).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                <span className="text-text-primary">{t.name}</span>
                <span className="text-xs text-text-muted">{[t.planet_name, t.type].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </MfdPanel>
      ))}
    </div>
  );
}
