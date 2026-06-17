import { db } from "../db";
import type { TenantContext } from "../tenant";
import { getTreasuryBalance } from "./treasury";

export interface AdminStats {
  // Membership
  totalMembers: number;
  enlisted: number;
  nco: number;
  officer: number;
  command: number;
  pendingApplications: number;
  // Operations
  openOperations: number;
  upcomingEvents: number;
  openContracts: number;
  activeLfg: number;
  // Content
  forumThreads: number;
  forumPosts: number;
  newsPosts: number;
  galleryItems: number;
  // Activity
  lootMembers: number;
  treasuryBalance: number;
  totalAwards: number;
  openTickets: number;
}

const LIVE_OP_STATUSES = ["PLANNING", "BRIEFING", "ACTIVE", "DEBRIEFING"] as const;

export async function getAdminStats(ctx: TenantContext): Promise<AdminStats> {
  const now = new Date();

  const [
    totalMembers,
    enlisted,
    nco,
    officer,
    command,
    pendingApplications,
    openOperations,
    upcomingEvents,
    openContracts,
    activeLfg,
    forumThreads,
    forumPosts,
    newsPosts,
    galleryItems,
    lootMembers,
    totalAwards,
    openTickets,
    treasuryBalance,
  ] = await Promise.all([
    db(ctx).membership.count(),
    db(ctx).membership.count({ where: { tier: "ENLISTED" } }),
    db(ctx).membership.count({ where: { tier: "NCO" } }),
    db(ctx).membership.count({ where: { tier: "OFFICER" } }),
    db(ctx).membership.count({ where: { tier: "COMMAND" } }),
    db(ctx).application.count({ where: { status: "PENDING" } }),
    db(ctx).operation.count({
      where: { status: { in: [...LIVE_OP_STATUSES] } },
    }),
    db(ctx).event.count({ where: { startsAt: { gte: now } } }),
    db(ctx).contract.count({ where: { status: "OPEN" } }),
    db(ctx).lfgPost.count({ where: { status: "OPEN" } }),
    db(ctx).forumThread.count(),
    db(ctx).forumPost.count(),
    db(ctx).newsPost.count(),
    db(ctx).galleryItem.count(),
    db(ctx).lootMember.count(),
    db(ctx).memberAward.count(),
    db(ctx).application.count({ where: { status: "PENDING" } }),
    getTreasuryBalance(ctx),
  ]);

  return {
    totalMembers,
    enlisted,
    nco,
    officer,
    command,
    pendingApplications,
    openOperations,
    upcomingEvents,
    openContracts,
    activeLfg,
    forumThreads,
    forumPosts,
    newsPosts,
    galleryItems,
    lootMembers,
    treasuryBalance,
    totalAwards,
    openTickets,
  };
}
