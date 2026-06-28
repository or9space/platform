import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/tenant";

/**
 * Public (logged-out) org stats for the tenant landing page. Ported from the
 * Freedom Guards site. Adapted to the platform schema: members are Memberships,
 * rank is the Membership.tier enum, and Operation has no completedAt (we order
 * COMPLETED ops by updatedAt and surface scheduledAt ?? updatedAt as the date).
 */
export interface PublicOrgStats {
  memberCount: number;
  nextOp: { id: string; title: string; scheduledAt: Date } | null;
  lastOp: { id: string; title: string } | null;
  recentOps: Array<{
    id: string;
    title: string;
    status: "ACTIVE" | "DEBRIEFING" | "COMPLETED";
    date: Date | null;
    signupCount: number;
    crew: Array<{
      username: string;
      displayName: string | null;
      avatar: string | null;
      tier: string | null;
    }>;
  }>;
}

const EMPTY_STATS: PublicOrgStats = {
  memberCount: 0,
  nextOp: null,
  lastOp: null,
  recentOps: [],
};

export async function getPublicOrgStats(ctx: TenantContext): Promise<PublicOrgStats> {
  try {
    return await loadPublicOrgStats(ctx);
  } catch (err) {
    // Public landing must render even when the database is unreachable.
    console.warn("[public-org-stats] query failed, returning empty stats", err);
    return EMPTY_STATS;
  }
}

async function loadPublicOrgStats(ctx: TenantContext): Promise<PublicOrgStats> {
  const d = db(ctx);
  const [memberCount, nextOp, lastOp, recentOpsRaw] = await Promise.all([
    d.membership.count(),

    d.operation.findFirst({
      where: {
        status: { in: ["PLANNING", "BRIEFING", "ACTIVE"] },
        scheduledAt: { not: null, gte: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      select: { id: true, title: true, scheduledAt: true },
    }),

    d.operation.findFirst({
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    }),

    d.operation.findMany({
      where: { status: { in: ["ACTIVE", "DEBRIEFING", "COMPLETED"] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        status: true,
        scheduledAt: true,
        updatedAt: true,
        _count: { select: { signups: true } },
        signups: {
          take: 5,
          orderBy: { createdAt: "asc" },
          select: {
            membership: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
                tier: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const recentOps = recentOpsRaw.map((op) => {
    const seen = new Set<string>();
    const crew = op.signups
      .filter((s) => {
        if (seen.has(s.membership.username)) return false;
        seen.add(s.membership.username);
        return true;
      })
      .map((s) => ({
        username: s.membership.username,
        displayName: s.membership.displayName,
        avatar: s.membership.avatarUrl,
        tier: s.membership.tier,
      }));

    return {
      id: op.id,
      title: op.title,
      status: op.status as "ACTIVE" | "DEBRIEFING" | "COMPLETED",
      date: op.scheduledAt ?? op.updatedAt ?? null,
      signupCount: op._count.signups,
      crew,
    };
  });

  return {
    memberCount,
    nextOp:
      nextOp && nextOp.scheduledAt
        ? { id: nextOp.id, title: nextOp.title, scheduledAt: nextOp.scheduledAt }
        : null,
    lastOp: lastOp ? { id: lastOp.id, title: lastOp.title } : null,
    recentOps,
  };
}
