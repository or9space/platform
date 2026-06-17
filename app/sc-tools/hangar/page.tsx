import { getVehicles } from "@/lib/uex/queries";
import { UexNotice, safeUex } from "@/components/sc-tools/ui";
import { Rocket } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";

export default async function HangarPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const vehicles = await safeUex(getVehicles);
  if (!vehicles.ok) return <div className="p-3 sm:p-6"><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></div>;

  const query = (q ?? "").trim().toLowerCase();
  const rows = vehicles.data
    .filter((v) => v.is_spaceship)
    .filter((v) => !query || `${v.name} ${v.company_name ?? ""}`.toLowerCase().includes(query))
    .sort((a, b) => (a.company_name ?? "").localeCompare(b.company_name ?? "") || a.name.localeCompare(b.name))
    .slice(0, 200);

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={Rocket} title="Hangar" subtitle="Browse the full ship catalog with cargo, crew and specs." />
      <form method="get" className="flex items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Search ships…" className="w-full rounded border border-border-light bg-surface p-2 text-sm" />
        <button type="submit" className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream">Search</button>
      </form>
      <p className="text-xs text-text-muted">{rows.length} ships</p>
      <MfdPanel title={<span>[ HANGAR ]</span>} chassis="neutral" bodyPadding="sm">
        <ul className="grid gap-2 sm:grid-cols-2">
          {rows.map((v) => (
            <li key={v.id}>
              <a href={`/sc-tools/loadouts?id=${v.id}`} className="block mfd-cut-tl-br border border-border p-3 transition-colors hover:border-primary">
                <p className="font-medium text-text-primary">{v.name_full ?? v.name}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {v.company_name ?? "—"}
                  {v.scu ? ` · ${v.scu} SCU` : ""}
                  {v.crew ? ` · crew ${v.crew}` : ""}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </MfdPanel>
    </div>
  );
}
