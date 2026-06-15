import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface ContractRow {
  id: string;
  title: string;
  description: string | null;
  reward: string | null;
  status: string;
  claimedById: string | null;
  claimedByName: string | null;
  claimedByUsername: string | null;
}

export async function listContracts(ctx: TenantContext): Promise<ContractRow[]> {
  const rows = await db(ctx).contract.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, description: true, reward: true, status: true, claimedById: true,
      claimedBy: { select: { displayName: true, username: true } },
    },
  });
  return rows.map((c) => ({
    id: c.id, title: c.title, description: c.description, reward: c.reward, status: c.status,
    claimedById: c.claimedById,
    claimedByName: c.claimedBy ? (c.claimedBy.displayName ?? c.claimedBy.username) : null,
    claimedByUsername: c.claimedBy?.username ?? null,
  }));
}
