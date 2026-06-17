import { notFound } from "next/navigation";
import { Activity } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader icon={Activity} title="Activity" subtitle="Recent org activity tape" />

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
