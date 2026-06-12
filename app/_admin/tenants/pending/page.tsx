import { prismaGlobal } from "@/lib/db";
import { DecideButtons } from "./decide-buttons";

export default async function PendingTenantsPage() {
  const rows = await prismaGlobal.pendingTenant.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  const liveSlugs = await prismaGlobal.tenant.findMany({ select: { slug: true, name: true } });

  function similarTo(slug: string): string | null {
    const hit = liveSlugs.find(
      (t) => t.slug !== slug && (t.slug.includes(slug) || slug.includes(t.slug)),
    );
    return hit ? `similar to existing "${hit.slug}"` : null;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pending org requests</h1>
      {rows.length === 0 && <p className="text-neutral-400">Queue is empty.</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded border border-neutral-800 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">
                  {r.name}{" "}
                  <code className="text-neutral-400">{r.slug}.or9.space</code>
                </p>
                <p className="text-sm text-neutral-400">
                  {r.requestedEmail} · {r.createdAt.toISOString().slice(0, 10)}
                </p>
                {similarTo(r.slug) && (
                  <p className="text-sm text-amber-400">⚠ {similarTo(r.slug)}</p>
                )}
                <p className="mt-2 text-sm text-neutral-300">{r.description}</p>
              </div>
              <DecideButtons pendingId={r.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
