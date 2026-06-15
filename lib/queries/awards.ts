import { db } from "../db";
import type { TenantContext } from "../tenant";

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
  recipients: AwardRecipient[];
}

export async function listAwardsWithRecipients(ctx: TenantContext): Promise<AwardWithRecipients[]> {
  const rows = await db(ctx).award.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, description: true,
      recipients: {
        orderBy: { awardedAt: "desc" },
        select: { membershipId: true, note: true, member: { select: { displayName: true, username: true } } },
      },
    },
  });
  return rows.map((a) => ({
    id: a.id, name: a.name, description: a.description,
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
