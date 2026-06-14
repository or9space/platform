import { db } from "../db";
import type { TenantContext } from "../tenant";
import { isFeatureEnabled, type FeatureMap } from "../features";
import { hasTier, type RankTier } from "../permissions";
import { listRecentThreads, type RecentThread } from "./forums";
import { listLootMembersWithBalances } from "./loot";
import { listTournaments, type TournamentRow } from "./tournaments";
import { getTreasuryBalance } from "./treasury";

export interface DashboardData {
  memberCount: number;
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

  return { memberCount, forums, loot, tournaments, treasury };
}
