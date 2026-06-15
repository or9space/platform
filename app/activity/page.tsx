import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { getActivityFeed } from "@/lib/queries/activity";

function timeAgo(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function ActivityPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();

  const feed = await getActivityFeed(makeTenantContext(ctx.tenant.id), ctx.features, 40);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Activity</h1>
      {feed.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing yet.</p>
      ) : (
        <ul className="space-y-2">
          {feed.map((e, i) => (
            <li key={i} className="flex items-center gap-3 rounded border border-neutral-800 p-3">
              <span className="shrink-0 rounded border border-neutral-700 px-2 py-0.5 font-mono text-xs uppercase text-neutral-400">{e.kind}</span>
              <a href={e.href} className="min-w-0 flex-1 truncate text-sm text-neutral-200 hover:underline">{e.title}</a>
              <span className="shrink-0 text-xs text-neutral-500">{e.who ? `${e.who} · ` : ""}{timeAgo(e.when)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
