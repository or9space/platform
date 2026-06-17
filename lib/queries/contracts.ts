import { db } from "../db";
import type { TenantContext } from "../tenant";

export const CONTRACT_TYPES = [
  "GENERAL", "ESCORT", "MINING", "COMBAT", "SALVAGE",
  "TRANSPORT", "BOUNTY", "RECON", "MEDICAL", "TRADE",
] as const;
export type ContractTypeValue = typeof CONTRACT_TYPES[number];

export const CONTRACT_STATUSES = ["OPEN", "CLAIMED", "COMPLETED", "CANCELLED"] as const;
export type ContractStatusValue = typeof CONTRACT_STATUSES[number];

export interface ContractRow {
  id: string;
  title: string;
  description: string | null;
  reward: string | null;
  type: ContractTypeValue;
  status: string;
  expiresAt: Date | null;
  claimedById: string | null;
  claimedByName: string | null;
  claimedByUsername: string | null;
  createdByName: string | null;
  createdByUsername: string | null;
}

export interface ListContractsFilter {
  type?: ContractTypeValue;
  status?: ContractStatusValue;
}

export async function listContracts(
  ctx: TenantContext,
  filter: ListContractsFilter = {},
): Promise<ContractRow[]> {
  const rows = await db(ctx).contract.findMany({
    where: {
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, description: true, reward: true,
      type: true, status: true, expiresAt: true, claimedById: true,
      claimedBy: { select: { displayName: true, username: true } },
      createdBy: { select: { displayName: true, username: true } },
    },
  });
  return rows.map((c) => ({
    id: c.id, title: c.title, description: c.description, reward: c.reward,
    type: c.type as ContractTypeValue,
    status: c.status,
    expiresAt: c.expiresAt,
    claimedById: c.claimedById,
    claimedByName: c.claimedBy ? (c.claimedBy.displayName ?? c.claimedBy.username) : null,
    claimedByUsername: c.claimedBy?.username ?? null,
    createdByName: c.createdBy ? (c.createdBy.displayName ?? c.createdBy.username) : null,
    createdByUsername: c.createdBy?.username ?? null,
  }));
}
