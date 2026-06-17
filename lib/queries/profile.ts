import { db } from "../db";
import type { TenantContext } from "../tenant";
import { ATTENDANCE_POINTS } from "../loot";

// ---------------------------------------------------------------------------
// Loot standing
// ---------------------------------------------------------------------------

export interface ProfileLootStanding {
  lootMemberId: string;
  displayName: string;
  balanceTenths: number;
  rank: number; // 1-based position in the tenant leaderboard
}

export async function getProfileLootStanding(
  ctx: TenantContext,
  membershipId: string,
): Promise<ProfileLootStanding | null> {
  // Find the LootMember row linked to this membership
  const lootMember = await db(ctx).lootMember.findFirst({
    where: { membershipId },
    select: { id: true, displayName: true },
  });
  if (!lootMember) return null;

  // Compute balance for this member
  const [atts, txns] = await Promise.all([
    db(ctx).lootAttendance.findMany({
      where: { memberId: lootMember.id },
      select: { status: true },
    }),
    db(ctx).lootTransaction.findMany({
      where: { memberId: lootMember.id },
      select: { amountTenths: true },
    }),
  ]);
  const balanceTenths =
    atts.reduce(
      (s, a) =>
        s + ATTENDANCE_POINTS[a.status as "PRESENT" | "LATE" | "ABSENT"],
      0,
    ) + txns.reduce((s, t) => s + t.amountTenths, 0);

  // Compute rank: how many other members have a strictly higher balance
  // We do this in JS to avoid raw SQL — fetch all members' balances.
  const [allMembers, allAtts, allTxns] = await Promise.all([
    db(ctx).lootMember.findMany({ select: { id: true } }),
    db(ctx).lootAttendance.findMany({ select: { memberId: true, status: true } }),
    db(ctx).lootTransaction.findMany({
      select: { memberId: true, amountTenths: true },
    }),
  ]);
  const balMap = new Map<string, number>();
  for (const a of allAtts) {
    balMap.set(
      a.memberId,
      (balMap.get(a.memberId) ?? 0) +
        ATTENDANCE_POINTS[a.status as "PRESENT" | "LATE" | "ABSENT"],
    );
  }
  for (const t of allTxns) {
    balMap.set(
      t.memberId,
      (balMap.get(t.memberId) ?? 0) + t.amountTenths,
    );
  }
  const higherCount = allMembers.filter(
    (m) => (balMap.get(m.id) ?? 0) > balanceTenths,
  ).length;

  return {
    lootMemberId: lootMember.id,
    displayName: lootMember.displayName,
    balanceTenths,
    rank: higherCount + 1,
  };
}

// ---------------------------------------------------------------------------
// Awards
// ---------------------------------------------------------------------------

export interface ProfileAward {
  id: string;
  name: string;
  description: string | null;
  note: string | null;
  awardedAt: Date;
}

export async function getProfileAwards(
  ctx: TenantContext,
  membershipId: string,
): Promise<ProfileAward[]> {
  const rows = await db(ctx).memberAward.findMany({
    where: { membershipId },
    orderBy: { awardedAt: "desc" },
    select: {
      id: true,
      note: true,
      awardedAt: true,
      award: { select: { name: true, description: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.award?.name ?? "Award",
    description: r.award?.description ?? null,
    note: r.note,
    awardedAt: r.awardedAt,
  }));
}

// ---------------------------------------------------------------------------
// Recent forum activity (threads authored + recent posts)
// ---------------------------------------------------------------------------

export interface ProfileForumThread {
  id: string;
  title: string;
  categorySlug: string;
  postCount: number;
  createdAt: Date;
}

export interface ProfileForumPost {
  id: string;
  threadId: string;
  threadTitle: string;
  categorySlug: string;
  snippet: string;
  createdAt: Date;
}

export interface ProfileForumActivity {
  recentThreads: ProfileForumThread[];
  recentPosts: ProfileForumPost[];
}

export async function getProfileForumActivity(
  ctx: TenantContext,
  membershipId: string,
  limit = 5,
): Promise<ProfileForumActivity> {
  const [threads, posts] = await Promise.all([
    db(ctx).forumThread.findMany({
      where: { authorMembershipId: membershipId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        createdAt: true,
        category: { select: { slug: true } },
        _count: { select: { posts: true } },
      },
    }),
    db(ctx).forumPost.findMany({
      where: { authorMembershipId: membershipId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        content: true,
        createdAt: true,
        thread: {
          select: {
            id: true,
            title: true,
            category: { select: { slug: true } },
          },
        },
      },
    }),
  ]);

  return {
    recentThreads: threads.map((t) => ({
      id: t.id,
      title: t.title,
      categorySlug: t.category?.slug ?? "",
      postCount: t._count.posts,
      createdAt: t.createdAt,
    })),
    recentPosts: posts.map((p) => ({
      id: p.id,
      threadId: p.thread?.id ?? "",
      threadTitle: p.thread?.title ?? "",
      categorySlug: p.thread?.category?.slug ?? "",
      snippet: p.content.slice(0, 140),
      createdAt: p.createdAt,
    })),
  };
}

// ---------------------------------------------------------------------------
// Event attendance (GOING RSVPs)
// ---------------------------------------------------------------------------

export interface ProfileEventRsvp {
  id: string;
  eventId: string;
  title: string;
  type: string;
  startsAt: Date;
  status: string;
}

export async function getProfileEventRsvps(
  ctx: TenantContext,
  membershipId: string,
  limit = 10,
): Promise<ProfileEventRsvp[]> {
  const rows = await db(ctx).eventRsvp.findMany({
    where: { membershipId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      event: { select: { id: true, title: true, type: true, startsAt: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    eventId: r.event?.id ?? "",
    title: r.event?.title ?? "",
    type: r.event?.type ?? "",
    startsAt: r.event?.startsAt ?? new Date(0),
    status: r.status,
  }));
}

// ---------------------------------------------------------------------------
// Operation history
// ---------------------------------------------------------------------------

export interface ProfileOperationSignup {
  id: string;
  operationId: string;
  title: string;
  status: string;
  scheduledAt: Date | null;
  role: string | null;
}

export async function getProfileOperationSignups(
  ctx: TenantContext,
  membershipId: string,
  limit = 10,
): Promise<ProfileOperationSignup[]> {
  const rows = await db(ctx).operationSignup.findMany({
    where: { membershipId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      role: true,
      operation: {
        select: {
          id: true,
          title: true,
          status: true,
          scheduledAt: true,
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    operationId: r.operation?.id ?? "",
    title: r.operation?.title ?? "",
    status: r.operation?.status ?? "",
    scheduledAt: r.operation?.scheduledAt ?? null,
    role: r.role,
  }));
}

// ---------------------------------------------------------------------------
// Handbook acknowledgements
// ---------------------------------------------------------------------------

export interface ProfileHandbookAck {
  id: string;
  handbookTitle: string;
  versionRead: number;
  acknowledgedAt: Date;
}

export async function getProfileHandbookAcks(
  ctx: TenantContext,
  membershipId: string,
): Promise<ProfileHandbookAck[]> {
  const rows = await db(ctx).handbookAcknowledgement.findMany({
    where: { membershipId },
    orderBy: { acknowledgedAt: "desc" },
    select: {
      id: true,
      versionRead: true,
      acknowledgedAt: true,
      handbook: { select: { title: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    handbookTitle: r.handbook?.title ?? "Handbook",
    versionRead: r.versionRead,
    acknowledgedAt: r.acknowledgedAt,
  }));
}

// ---------------------------------------------------------------------------
// Aggregated profile data — call once per page render
// ---------------------------------------------------------------------------

export interface ProfileData {
  loot: ProfileLootStanding | null;
  awards: ProfileAward[];
  forumActivity: ProfileForumActivity;
  eventRsvps: ProfileEventRsvp[];
  operationSignups: ProfileOperationSignup[];
  handbookAcks: ProfileHandbookAck[];
}

export async function getProfileData(
  ctx: TenantContext,
  membershipId: string,
): Promise<ProfileData> {
  const [loot, awards, forumActivity, eventRsvps, operationSignups, handbookAcks] =
    await Promise.all([
      getProfileLootStanding(ctx, membershipId),
      getProfileAwards(ctx, membershipId),
      getProfileForumActivity(ctx, membershipId),
      getProfileEventRsvps(ctx, membershipId),
      getProfileOperationSignups(ctx, membershipId),
      getProfileHandbookAcks(ctx, membershipId),
    ]);
  return { loot, awards, forumActivity, eventRsvps, operationSignups, handbookAcks };
}
