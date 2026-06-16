import {
  Users, Swords, MessagesSquare, Calendar, Coins, Wallet, Trophy, Clock,
  Newspaper, TrendingUp, ArrowRight,
} from "lucide-react";
import { getDashboardData } from "@/lib/queries/dashboard";
import { type FeatureMap } from "@/lib/features";
import { makeTenantContext } from "@/lib/tenant";
import type { ViewerMembership } from "@/lib/authz";
import { AdSlot } from "@/components/ads/ad-slot";
import { EventTypeBadge } from "@/components/events/event-type-badge";
import { CategoryBadge } from "@/components/news/category-badge";
import { formatDateTime, formatDate } from "@/lib/format";
import { MfdPanel } from "@/components/ui/mfd";

const fmtPts = (tenths: number) =>
  (tenths / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });

function timeAgo(d: Date | null): string {
  if (!d) return "—";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Signed-in member's org home — the FG "MFD" daily briefing layout. */
export async function OrgDashboard({
  tenantId, features, viewer,
}: {
  tenantId: string;
  features: FeatureMap;
  viewer: ViewerMembership;
}) {
  const ctx = makeTenantContext(tenantId);
  const data = await getDashboardData(ctx, {
    features, viewerTier: viewer.tier, viewerMembershipId: viewer.id,
  });

  type Stat = { label: string; value: string; icon: typeof Users; color: string };
  const stats: Stat[] = [
    { label: "Members", value: String(data.memberCount), icon: Users, color: "text-success" },
  ];
  if (data.operations) stats.push({ label: "Active Ops", value: String(data.operations.live), icon: Swords, color: "text-primary" });
  if (data.forums) stats.push({ label: "Forum Threads", value: String(data.forums.threadCount), icon: MessagesSquare, color: "text-fg-blue-light" });
  if (data.events) stats.push({ label: "Upcoming Events", value: String(data.events.upcoming.length), icon: Calendar, color: "text-fg-red-light" });
  if (data.loot) stats.push({
    label: data.loot.viewer ? "Your Loot Rank" : "Loot Members",
    value: data.loot.viewer ? `#${data.loot.viewer.rank}` : String(data.loot.memberCount),
    icon: Coins, color: "text-amber",
  });
  if (data.tournaments) stats.push({ label: "Open Tournaments", value: String(data.tournaments.open), icon: Trophy, color: "text-warning" });
  if (data.treasury) stats.push({ label: "Treasury", value: data.treasury.balance.toLocaleString(), icon: Wallet, color: "text-success" });

  return (
    <div className="p-3 sm:p-6 animate-page-enter">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{viewer.displayName ?? viewer.username}</h1>
        <p className="text-text-muted">Daily briefing.</p>
      </div>

      {/* Quick stats — chamfered MFD readout strip */}
      <div className="mb-8 flex flex-wrap items-stretch gap-x-6 gap-y-3 border border-border bg-surface-elevated px-4 py-2.5 mfd-cut-tl-br">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex min-w-0 items-center gap-2.5">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${stat.color}`} aria-hidden="true" />
              <span className="mfd-label">{stat.label}</span>
              <span className="mfd-readout text-base font-semibold">{stat.value}</span>
            </div>
          );
        })}
      </div>

      {/* Announcements — primary chassis */}
      {data.news && data.news.latest.length > 0 && (
        <div className="mb-6">
          <MfdPanel
            chassis="primary"
            bodyPadding="md"
            title={<><Newspaper className="h-3 w-3 text-primary" /><span className="text-primary">[ ANNOUNCEMENTS ]</span></>}
            titleAside={<a href="/news" className="flex items-center gap-1 mfd-label hover:text-primary">View All<ArrowRight className="h-3 w-3" /></a>}
          >
            <div className="space-y-3">
              {data.news.latest.map((p) => (
                <a key={p.id} href={`/news/${p.id}`} className="block">
                  <div className="border border-primary/20 bg-primary/5 p-4 transition-colors hover:border-primary/40 hover:bg-primary/10">
                    <div className="mb-1 flex items-center gap-2">
                      {p.isPinned && <span className="text-[10px] font-semibold uppercase tracking-wider text-amber">Pinned</span>}
                      <CategoryBadge category={p.category} />
                      <span className="text-xs text-text-muted">by <span className="text-text-secondary">{p.authorName}</span> · {formatDate(p.createdAt)}</span>
                    </div>
                    <h4 className="font-semibold text-text-primary">{p.title}</h4>
                  </div>
                </a>
              ))}
            </div>
          </MfdPanel>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mission clock — upcoming events (wide) */}
        <div className="lg:col-span-2">
          <MfdPanel
            chassis="neutral"
            bodyPadding="sm"
            title={<><Clock className="h-3 w-3 text-text-secondary" /><span>[ MISSION CLOCK ]</span></>}
            titleAside={<span className="mfd-readout text-[10px]">{data.events?.upcoming.length ?? 0}</span>}
          >
            {!data.events || data.events.upcoming.length === 0 ? (
              <p className="px-1 py-2 text-sm text-text-muted">No upcoming events.</p>
            ) : (
              <ul className="space-y-2">
                {data.events.upcoming.map((e) => (
                  <li key={e.id}>
                    <a href={`/events/${e.id}`} className="flex items-center justify-between border border-border bg-surface-elevated px-3 py-2 transition-colors hover:border-primary/40 hover:bg-surface-hover">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">{e.title}</p>
                        <p className="mfd-readout mt-0.5 text-[11px]">{formatDateTime(e.startsAt)} · {e.goingCount} going</p>
                      </div>
                      <EventTypeBadge type={e.type} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </MfdPanel>
        </div>

        {/* Loot standings */}
        {data.loot && (
          <div>
            <MfdPanel
              chassis="neutral"
              bodyPadding="sm"
              title={<><Coins className="h-3 w-3 text-amber" /><span>[ LOOT STANDINGS ]</span></>}
              titleAside={<a href="/loot" className="flex items-center gap-1 mfd-label hover:text-primary">View All<ArrowRight className="h-3 w-3" /></a>}
            >
              {data.loot.top.length === 0 ? (
                <p className="px-1 py-2 text-sm text-text-muted">No loot members yet.</p>
              ) : (
                <ol className="space-y-1.5">
                  {data.loot.top.map((m, i) => (
                    <li key={`${i}-${m.membershipId ?? m.displayName}`} className="flex items-center justify-between text-sm">
                      <span className="truncate"><span className="mr-2 mfd-readout text-[11px]">#{i + 1}</span><span className="text-text-primary">{m.displayName}</span></span>
                      <span className="mfd-readout text-[11px]">{fmtPts(m.balanceTenths)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </MfdPanel>
          </div>
        )}

        {/* Forum activity */}
        {data.forums && (
          <div className="lg:col-span-2">
            <MfdPanel
              chassis="neutral"
              bodyPadding="sm"
              title={<><TrendingUp className="h-3 w-3 text-text-secondary" /><span>[ FORUM ACTIVITY ]</span></>}
              titleAside={<a href="/forums" className="flex items-center gap-1 mfd-label hover:text-primary">View All<ArrowRight className="h-3 w-3" /></a>}
            >
              {data.forums.recent.length === 0 ? (
                <p className="px-1 py-2 text-sm text-text-muted">No threads yet.</p>
              ) : (
                <div className="space-y-0.5">
                  {data.forums.recent.map((t) => (
                    <a key={t.id} href={`/forums/${t.categorySlug}/${t.id}`} className="block border-b border-border/40 px-1 py-2 transition-colors hover:bg-surface-hover">
                      <p className="truncate text-sm font-medium text-text-primary">{t.title}</p>
                      <p className="text-xs text-text-muted">{t.categoryName} · {t.authorName} · {t.postCount} posts · {timeAgo(t.lastPostAt)}</p>
                    </a>
                  ))}
                </div>
              )}
            </MfdPanel>
          </div>
        )}

        {/* Tournaments */}
        {data.tournaments && data.tournaments.recent.length > 0 && (
          <div>
            <MfdPanel
              chassis="neutral"
              bodyPadding="sm"
              title={<><Trophy className="h-3 w-3 text-warning" /><span>[ TOURNAMENTS ]</span></>}
            >
              <ul className="space-y-1.5">
                {data.tournaments.recent.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <a href={`/tournaments/${t.id}`} className="truncate text-text-primary hover:underline">{t.name}</a>
                    <span className="ml-2 shrink-0 mfd-label">{t.status} · {t.entryCount}</span>
                  </li>
                ))}
              </ul>
            </MfdPanel>
          </div>
        )}
      </div>

      <div className="mt-6"><AdSlot slot="sidebar-bottom" /></div>
    </div>
  );
}
