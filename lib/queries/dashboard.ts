import { db } from "../db";
import type { TenantContext } from "../tenant";
import { isFeatureEnabled, type FeatureMap } from "../features";
import { hasTier, type RankTier } from "../permissions";
import { listRecentThreads, type RecentThread } from "./forums";
import { listLootMembersWithBalances } from "./loot";
import { listTournaments, type TournamentRow } from "./tournaments";
import { listUpcomingEvents, type EventRow } from "./events";
import { latestNews, type NewsRow } from "./news";
import { listOperations } from "./operations";
import { getTreasuryBalance } from "./treasury";

const LIVE_OPS = new Set(["PLANNING", "BRIEFING", "ACTIVE", "DEBRIEFING"]);

export interface DashboardData {
  memberCount: number;
  events: { upcoming: EventRow[] } | null;
  news: { latest: NewsRow[] } | null;
  operations: { live: number } | null;
  forums: { threadCount: number; recent: RecentThread[] } | null;
  loot: {
    top: { displayName: string; membershipId: string | null; balanceTenths: number }[];
    viewer: { rank: number; balanceTenths: number } | null;
    memberCount: number;
  } | null;
  tournaments: { total: number; open: number; recent: TournamentRow[] } | null;
  treasury: { balance: number } | null; // OFFICER+ only
}

const CLOSED_TOURNAMENT = new Set(["COMPLETED", "ARCHIVED", "CANCELLED"]);

/**
 * Assemble the signed-in member's org dashboard from whatever modules the
 * tenant has enabled. Each section is gated on its feature flag; treasury is
 * additionally OFFICER+ (mirrors the treasury page gate). All reads go through
 * db(ctx) so RLS scopes them to the tenant.
 */
export async function getDashboardData(
  ctx: TenantContext,
  opts: { features: FeatureMap; viewerTier: RankTier | null; viewerMembershipId: string | null },
): Promise<DashboardData> {
  const { features, viewerTier, viewerMembershipId } = opts;

  const memberCount = await db(ctx).membership.count();

  let events: DashboardData["events"] = null;
  if (isFeatureEnabled(features, "events")) {
    events = { upcoming: await listUpcomingEvents(ctx, 5) };
  }

  let news: DashboardData["news"] = null;
  if (isFeatureEnabled(features, "news")) {
    news = { latest: await latestNews(ctx, 3) };
  }

  let operations: DashboardData["operations"] = null;
  if (isFeatureEnabled(features, "operations")) {
    const all = await listOperations(ctx);
    operations = { live: all.filter((o) => LIVE_OPS.has(o.status)).length };
  }

  let forums: DashboardData["forums"] = null;
  if (isFeatureEnabled(features, "forums")) {
    const [recent, threadCount] = await Promise.all([
      listRecentThreads(ctx, 5),
      db(ctx).forumThread.count(),
    ]);
    forums = { threadCount, recent };
  }

  let loot: DashboardData["loot"] = null;
  if (isFeatureEnabled(features, "loot")) {
    const all = await listLootMembersWithBalances(ctx);
    let viewer: { rank: number; balanceTenths: number } | null = null;
    if (viewerMembershipId) {
      const idx = all.findIndex((m) => m.membershipId === viewerMembershipId);
      if (idx >= 0) viewer = { rank: idx + 1, balanceTenths: all[idx].balanceTenths };
    }
    loot = { top: all.slice(0, 5), viewer, memberCount: all.length };
  }

  let tournaments: DashboardData["tournaments"] = null;
  if (isFeatureEnabled(features, "tournaments")) {
    const list = await listTournaments(ctx);
    const open = list.filter((t) => !CLOSED_TOURNAMENT.has(t.status)).length;
    tournaments = { total: list.length, open, recent: list.slice(0, 4) };
  }

  let treasury: DashboardData["treasury"] = null;
  if (isFeatureEnabled(features, "treasury") && hasTier(viewerTier, "OFFICER")) {
    treasury = { balance: await getTreasuryBalance(ctx) };
  }

  return { memberCount, events, news, operations, forums, loot, tournaments, treasury };
}
