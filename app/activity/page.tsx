import { notFound } from "next/navigation";
import { Activity } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { getActivityFeed } from "@/lib/queries/activity";
import { MfdPanel } from "@/components/ui/mfd";
import { ActivityItem } from "@/components/activity/activity-item";

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
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Activity className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Activity</h1>
          <p className="text-sm text-text-muted">Recent org activity tape</p>
        </div>
      </div>

      {/* Feed chassis */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ ACTIVITY TAPE ]</span>}
        titleAside={
          <span className="mfd-label tabular-nums">{feed.length} entries</span>
        }
        bodyPadding="none"
      >
        {feed.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-muted">Nothing yet.</p>
        ) : (
          <ul>
            {feed.map((e, i) => (
              <ActivityItem key={i} entry={e} timeAgo={timeAgo} />
            ))}
          </ul>
        )}
      </MfdPanel>
    </div>
  );
}
