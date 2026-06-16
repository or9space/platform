import { getDashboardData } from "@/lib/queries/dashboard";
import { isFeatureEnabled, type FeatureMap } from "@/lib/features";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import type { TenantConfig } from "@/lib/config/schema";
import type { ViewerMembership } from "@/lib/authz";
import { Rank } from "@/components/rank";
import { AdSlot } from "@/components/ads/ad-slot";
import { EventTypeBadge } from "@/components/events/event-type-badge";
import { CategoryBadge } from "@/components/news/category-badge";
import { formatDateTime, formatDate } from "@/lib/format";
import { StatTile } from "./stat-tile";
import { Panel } from "./panel";

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

/** The signed-in member's org home: welcome + stat strip + quick access + feeds. */
export async function OrgDashboard({
  tenantId,
  config,
  features,
  viewer,
}: {
  tenantId: string;
  config: TenantConfig;
  features: FeatureMap;
  viewer: ViewerMembership;
}) {
  const ctx = makeTenantContext(tenantId);
  const data = await getDashboardData(ctx, {
    features,
    viewerTier: viewer.tier,
    viewerMembershipId: viewer.id,
  });

  const quickLinks = [
    { show: isFeatureEnabled(features, "forums"), href: "/forums", label: "Forums" },
    { show: isFeatureEnabled(features, "events"), href: "/events", label: "Events" },
    { show: isFeatureEnabled(features, "news"), href: "/news", label: "News" },
    { show: isFeatureEnabled(features, "operations"), href: "/operations", label: "Operations" },
    { show: true, href: "/members", label: "Members" },
    { show: isFeatureEnabled(features, "handbook"), href: "/handbook", label: "Handbook" },
    { show: isFeatureEnabled(features, "loot"), href: "/loot", label: "Loot" },
    { show: isFeatureEnabled(features, "inventory"), href: "/inventory", label: "Inventory" },
    { show: isFeatureEnabled(features, "fleet"), href: "/fleet", label: "Fleet" },
    { show: isFeatureEnabled(features, "tournaments"), href: "/tournaments", label: "Tournaments" },
    {
      show: isFeatureEnabled(features, "treasury") && hasTier(viewer.tier, "OFFICER"),
      href: "/treasury",
      label: "Treasury",
    },
  ].filter((l) => l.show);

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      {/* Welcome */}
      <header>
        <h1 className="text-3xl font-bold text-text-primary">{config.branding.name}</h1>
        <p className="mt-1 text-text-secondary">
          Welcome back, <strong className="text-text-primary">{viewer.displayName ?? viewer.username}</strong>{" "}
          · <Rank tier={viewer.tier} />
          {config.branding.tagline && (
            <span className="block text-sm text-text-muted">{config.branding.tagline}</span>
          )}
        </p>
      </header>

      {/* Stat strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Members" value={data.memberCount} href="/members" />
        {data.events && (
          <StatTile
            label="Upcoming events"
            value={data.events.upcoming.length}
            sub={data.events.upcoming[0]?.title}
            href="/events"
          />
        )}
        {data.forums && (
          <StatTile label="Forum threads" value={data.forums.threadCount} href="/forums" />
        )}
        {data.loot &&
          (data.loot.viewer ? (
            <StatTile
              label="Your loot rank"
              value={`#${data.loot.viewer.rank}`}
              sub={`${fmtPts(data.loot.viewer.balanceTenths)} pts`}
              href="/loot"
            />
          ) : (
            <StatTile label="Loot members" value={data.loot.memberCount} href="/loot" />
          ))}
        {data.operations && (
          <StatTile label="Live operations" value={data.operations.live} href="/operations" />
        )}
        {data.tournaments && (
          <StatTile
            label="Open tournaments"
            value={data.tournaments.open}
            sub={`${data.tournaments.total} total`}
            href="/tournaments"
          />
        )}
        {data.treasury && (
          <StatTile
            label="Treasury"
            value={data.treasury.balance.toLocaleString()}
            sub="aUEC"
            href="/treasury"
          />
        )}
      </section>

      {/* Quick access */}
      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-text-muted">[ Jump in ]</h2>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-primary hover:text-text-primary"
            >
              {l.label}
            </a>
          ))}
        </div>
      </section>

      {/* Announcements — full width when present */}
      {data.news && data.news.latest.length > 0 && (
        <Panel title="Announcements" href="/news">
          <ul className="space-y-3">
            {data.news.latest.map((p) => (
              <li key={p.id}>
                <a href={`/news/${p.id}`} className="block rounded p-2 transition-colors hover:bg-surface-hover">
                  <div className="flex items-center gap-2">
                    {p.isPinned && <span className="text-xs font-semibold uppercase text-amber">Pinned</span>}
                    <CategoryBadge category={p.category} />
                    <span className="truncate text-sm font-medium text-text-primary">{p.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{p.authorName} · {formatDate(p.createdAt)}</p>
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Feeds */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data.events && (
          <Panel title="Mission clock" href="/events">
            {data.events.upcoming.length === 0 ? (
              <p className="text-sm text-text-muted">No upcoming events.</p>
            ) : (
              <ul className="space-y-3">
                {data.events.upcoming.map((e) => (
                  <li key={e.id}>
                    <a href={`/events/${e.id}`} className="block rounded p-2 transition-colors hover:bg-surface-hover">
                      <div className="flex items-center gap-2">
                        <EventTypeBadge type={e.type} />
                        <span className="truncate text-sm font-medium text-text-primary">{e.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        {formatDateTime(e.startsAt)} · {e.goingCount} going
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {data.forums && (
          <Panel title="Forum activity" href="/forums">
            {data.forums.recent.length === 0 ? (
              <p className="text-sm text-text-muted">No threads yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.forums.recent.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`/forums/${t.categorySlug}/${t.id}`}
                      className="block rounded p-2 transition-colors hover:bg-surface-hover"
                    >
                      <p className="truncate text-sm font-medium text-text-primary">{t.title}</p>
                      <p className="text-xs text-text-muted">
                        {t.categoryName} · {t.authorName} · {t.postCount} posts · {timeAgo(t.lastPostAt)}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {data.loot && (
          <Panel title="Loot standings" href="/loot">
            {data.loot.top.length === 0 ? (
              <p className="text-sm text-text-muted">No loot members yet.</p>
            ) : (
              <ol className="space-y-2">
                {data.loot.top.map((m, i) => (
                  <li key={`${i}-${m.membershipId ?? m.displayName}`} className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      <span className="mr-2 font-mono text-text-muted">#{i + 1}</span>
                      <span className="text-text-primary">{m.displayName}</span>
                    </span>
                    <span className="font-mono tabular-nums text-text-secondary">{fmtPts(m.balanceTenths)}</span>
                  </li>
                ))}
              </ol>
            )}
            {data.loot.viewer && (
              <p className="mt-3 border-t border-border pt-3 text-xs text-text-muted">
                You: #{data.loot.viewer.rank} · {fmtPts(data.loot.viewer.balanceTenths)} pts
              </p>
            )}
          </Panel>
        )}

        {data.tournaments && data.tournaments.recent.length > 0 && (
          <Panel title="Tournaments" href="/tournaments">
            <ul className="space-y-2">
              {data.tournaments.recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <a href={`/tournaments/${t.id}`} className="truncate text-text-primary hover:underline">
                    {t.name}
                  </a>
                  <span className="ml-2 shrink-0 font-mono text-xs uppercase text-text-muted">
                    {t.status} · {t.entryCount}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <AdSlot slot="sidebar-bottom" />
    </main>
  );
}
