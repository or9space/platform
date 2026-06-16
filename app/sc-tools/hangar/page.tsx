import { getVehicles } from "@/lib/uex/queries";
import { UexNotice, safeUex } from "@/components/sc-tools/ui";

export default async function HangarPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const vehicles = await safeUex(getVehicles);
  if (!vehicles.ok) return <Main><UexNotice>Couldn&apos;t reach UEX right now.</UexNotice></Main>;

  const query = (q ?? "").trim().toLowerCase();
  const rows = vehicles.data
    .filter((v) => v.is_spaceship)
    .filter((v) => !query || `${v.name} ${v.company_name ?? ""}`.toLowerCase().includes(query))
    .sort((a, b) => (a.company_name ?? "").localeCompare(b.company_name ?? "") || a.name.localeCompare(b.name))
    .slice(0, 200);

  return (
    <Main>
      <form method="get" className="flex items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Search ships…" className="w-full rounded border border-border-light bg-surface p-2 text-sm" />
        <button type="submit" className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream">Search</button>
      </form>
      <p className="text-xs text-text-muted">{rows.length} ships</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map((v) => (
          <li key={v.id}>
            <a href={`/sc-tools/loadouts?id=${v.id}`} className="block rounded border border-border p-3 transition-colors hover:border-primary">
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
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl space-y-4 p-6"><h1 className="text-2xl font-bold">Hangar — Ship Catalog</h1>{children}</main>;
}
