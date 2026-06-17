import { db } from "../db";
import type { TenantContext } from "../tenant";
import { ATTENDANCE_POINTS } from "../loot";

export async function getMemberBalance(ctx: TenantContext, lootMemberId: string): Promise<number> {
  const [atts, txns] = await Promise.all([
    db(ctx).lootAttendance.findMany({ where: { memberId: lootMemberId }, select: { status: true } }),
    db(ctx).lootTransaction.findMany({ where: { memberId: lootMemberId }, select: { amountTenths: true } }),
  ]);
  const attPts = atts.reduce((s, a) => s + ATTENDANCE_POINTS[a.status as "PRESENT" | "LATE" | "ABSENT"], 0);
  const txnPts = txns.reduce((s, t) => s + t.amountTenths, 0);
  return attPts + txnPts;
}

export interface LootMemberBalance {
  id: string;
  displayName: string;
  membershipId: string | null;
  balanceTenths: number;
}

export async function listLootMembersWithBalances(ctx: TenantContext): Promise<LootMemberBalance[]> {
  const [members, atts, txns] = await Promise.all([
    db(ctx).lootMember.findMany({ select: { id: true, displayName: true, membershipId: true } }),
    db(ctx).lootAttendance.findMany({ select: { memberId: true, status: true } }),
    db(ctx).lootTransaction.findMany({ select: { memberId: true, amountTenths: true } }),
  ]);
  const bal = new Map<string, number>();
  for (const a of atts) {
    bal.set(a.memberId, (bal.get(a.memberId) ?? 0) + ATTENDANCE_POINTS[a.status as "PRESENT" | "LATE" | "ABSENT"]);
  }
  for (const t of txns) {
    bal.set(t.memberId, (bal.get(t.memberId) ?? 0) + t.amountTenths);
  }
  return members
    .map((m) => ({
      id: m.id,
      displayName: m.displayName,
      membershipId: m.membershipId,
      balanceTenths: bal.get(m.id) ?? 0,
    }))
    .sort((a, b) => b.balanceTenths - a.balanceTenths || a.displayName.localeCompare(b.displayName));
}

export interface SessionGrid {
  id: string;
  label: string;
  sessionDate: Date;
  notes: string | null;
  rows: { memberId: string; displayName: string; status: string }[];
}

export async function getSessionWithGrid(ctx: TenantContext, sessionId: string): Promise<SessionGrid | null> {
  const s = await db(ctx).lootSession.findFirst({
    where: { id: sessionId },
    select: {
      id: true,
      label: true,
      sessionDate: true,
      notes: true,
      attendance: {
        select: {
          memberId: true,
          status: true,
          member: { select: { displayName: true } },
        },
      },
    },
  });
  if (!s) return null;
  return {
    id: s.id,
    label: s.label,
    sessionDate: s.sessionDate,
    notes: s.notes,
    rows: s.attendance.map((a) => ({
      memberId: a.memberId,
      displayName: a.member?.displayName ?? "Unknown",
      status: a.status,
    })),
  };
}

export async function listSessions(ctx: TenantContext) {
  return db(ctx).lootSession.findMany({
    orderBy: { sessionDate: "desc" },
    take: 200,
    select: { id: true, label: true, sessionDate: true, notes: true },
  });
}

export interface TxnRow {
  id: string;
  amountTenths: number;
  type: string;
  note: string | null;
  createdAt: Date;
}

export async function listMemberTransactions(ctx: TenantContext, lootMemberId: string): Promise<TxnRow[]> {
  return db(ctx).lootTransaction.findMany({
    where: { memberId: lootMemberId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, amountTenths: true, type: true, note: true, createdAt: true },
  }) as Promise<TxnRow[]>;
}

export interface RecentSpendRow {
  id: string;
  memberId: string;
  displayName: string;
  amountTenths: number;
  note: string | null;
  createdAt: Date;
}

/** Most recent SPEND transactions across all members, for the pile console feed. */
export async function listRecentSpends(
  ctx: TenantContext,
  limit = 10,
): Promise<RecentSpendRow[]> {
  const rows = await db(ctx).lootTransaction.findMany({
    where: { type: "SPEND" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      memberId: true,
      amountTenths: true,
      note: true,
      createdAt: true,
      member: { select: { displayName: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    memberId: r.memberId,
    displayName: (r.member as { displayName: string } | null)?.displayName ?? "Unknown",
    amountTenths: r.amountTenths,
    note: r.note,
    createdAt: r.createdAt,
  }));
}
