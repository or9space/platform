import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface SquadMemberRow {
  membershipId: string;
  name: string;
  username: string;
  role: string | null;
}

export interface SquadWithMembers {
  id: string;
  name: string;
  description: string | null;
  members: SquadMemberRow[];
}

export async function listSquadsWithMembers(ctx: TenantContext): Promise<SquadWithMembers[]> {
  const rows = await db(ctx).squad.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, description: true,
      members: {
        orderBy: { createdAt: "asc" },
        select: { membershipId: true, role: true, member: { select: { displayName: true, username: true } } },
      },
    },
  });
  return rows.map((s) => ({
    id: s.id, name: s.name, description: s.description,
    members: s.members.map((m) => ({
      membershipId: m.membershipId,
      name: m.member?.displayName ?? m.member?.username ?? "Unknown",
      username: m.member?.username ?? "",
      role: m.role,
    })),
  }));
}
