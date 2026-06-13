import { db } from "../db";
import type { TenantContext } from "../tenant";
import type { RankTier } from "../permissions";

const TIER_RANK: Record<RankTier, number> = { COMMAND: 3, OFFICER: 2, NCO: 1, ENLISTED: 0 };

export interface MemberRow {
  id: string;
  username: string;
  displayName: string | null;
  tier: RankTier;
  avatarUrl: string | null;
  createdAt: Date;
}

export async function listMembers(ctx: TenantContext, search?: string): Promise<MemberRow[]> {
  const q = search?.trim();
  const rows = await db(ctx).membership.findMany({
    where:
      q && q.length >= 1
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
    select: {
      id: true,
      username: true,
      displayName: true,
      tier: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
  return [...rows].sort(
    (a, b) =>
      TIER_RANK[b.tier as RankTier] - TIER_RANK[a.tier as RankTier] ||
      a.username.localeCompare(b.username),
  );
}

export interface MemberProfile extends MemberRow {
  bio: string | null;
  threadCount: number;
  postCount: number;
}

export async function getMemberByUsername(
  ctx: TenantContext,
  username: string,
): Promise<MemberProfile | null> {
  const m = await db(ctx).membership.findFirst({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      tier: true,
      avatarUrl: true,
      createdAt: true,
      bio: true,
      _count: { select: { authoredThreads: true, authoredPosts: true } },
    },
  });
  if (!m) return null;
  return {
    id: m.id,
    username: m.username,
    displayName: m.displayName,
    tier: m.tier as RankTier,
    avatarUrl: m.avatarUrl,
    createdAt: m.createdAt,
    bio: m.bio,
    threadCount: m._count.authoredThreads,
    postCount: m._count.authoredPosts,
  };
}

export async function countCommandMemberships(ctx: TenantContext): Promise<number> {
  return db(ctx).membership.count({ where: { tier: "COMMAND" } });
}
