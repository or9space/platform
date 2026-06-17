import { db } from "../db";
import type { TenantContext } from "../tenant";

export type AwardKind = "MEDAL" | "RIBBON" | "COMMENDATION" | "TROPHY" | "BADGE";

export interface AwardRecipient {
  membershipId: string;
  name: string;
  username: string;
  note: string | null;
}

export interface AwardWithRecipients {
  id: string;
  name: string;
  description: string | null;
  kind: AwardKind;
  icon: string | null;
  recipients: AwardRecipient[];
}

export async function listAwardsWithRecipients(ctx: TenantContext): Promise<AwardWithRecipients[]> {
  const rows = await db(ctx).award.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, description: true, kind: true, icon: true,
      recipients: {
        orderBy: { awardedAt: "desc" },
        select: { membershipId: true, note: true, member: { select: { displayName: true, username: true } } },
      },
    },
  });
  return rows.map((a) => ({
    id: a.id, name: a.name, description: a.description,
    kind: a.kind as AwardKind,
    icon: a.icon,
    recipients: a.recipients.map((r) => ({
      membershipId: r.membershipId,
      name: r.member?.displayName ?? r.member?.username ?? "Unknown",
      username: r.member?.username ?? "",
      note: r.note,
    })),
  }));
}

/** Awards held by one member — for their profile card. */
export async function listMemberAwards(ctx: TenantContext, membershipId: string) {
  const rows = await db(ctx).memberAward.findMany({
    where: { membershipId },
    orderBy: { awardedAt: "desc" },
    select: { note: true, awardedAt: true, award: { select: { name: true } } },
  });
  return rows.map((r) => ({ name: r.award?.name ?? "Award", note: r.note, awardedAt: r.awardedAt }));
}

export interface NominationRow {
  id: string;
  awardId: string;
  awardName: string;
  nomineeName: string;
  nomineeUsername: string;
  nominatorName: string;
  nominatorUsername: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
}

/** List award nominations — PENDING first, then by createdAt desc. */
export async function listNominations(ctx: TenantContext): Promise<NominationRow[]> {
  const rows = await db(ctx).awardNomination.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      awardId: true,
      reason: true,
      status: true,
      createdAt: true,
      award: { select: { name: true } },
      nominee: { select: { displayName: true, username: true } },
      nominator: { select: { displayName: true, username: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    awardId: r.awardId,
    awardName: r.award?.name ?? "Award",
    nomineeName: r.nominee?.displayName ?? r.nominee?.username ?? "Unknown",
    nomineeUsername: r.nominee?.username ?? "",
    nominatorName: r.nominator?.displayName ?? r.nominator?.username ?? "Unknown",
    nominatorUsername: r.nominator?.username ?? "",
    reason: r.reason,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
    createdAt: r.createdAt,
  }));
}
