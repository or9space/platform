import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const STATUSES = ["OPEN", "CLAIMED", "COMPLETED", "CANCELLED"] as const;

function requireOfficer(tier: RankTier): Result {
  return hasTier(tier, "OFFICER") ? { ok: true } : { ok: false, error: "Requires OFFICER+ in this org" };
}

const ContractSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(5000).nullable().optional(),
  reward: z.string().max(160).nullable().optional(),
});
export interface ContractInput { title: string; description?: string | null; reward?: string | null }

export async function createContractCore(
  tenantId: string, membershipId: string, tier: RankTier, input: ContractInput,
): Promise<Result<{ id: string }>> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = ContractSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { allowed } = checkRateLimit(`contract:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };
  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;
  const c = await db(ctx).contract.create({
    data: { tenantId, title: d.title, description: d.description ?? null, reward: d.reward ?? null, createdById: membershipId },
    select: { id: true },
  });
  return { ok: true, id: c.id };
}

export async function deleteContractCore(
  tenantId: string, _membershipId: string, tier: RankTier, id: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).contract.deleteMany({ where: { id } });
  if (res.count === 0) return { ok: false, error: "Not found" };
  return { ok: true };
}

export async function setContractStatusCore(
  tenantId: string, _membershipId: string, tier: RankTier, id: string, status: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { ok: false, error: "Invalid status" };
  const ctx = makeTenantContext(tenantId);
  const data = status === "OPEN" ? { status: "OPEN" as const, claimedById: null } : { status: status as (typeof STATUSES)[number] };
  const res = await db(ctx).contract.updateMany({ where: { id }, data });
  if (res.count === 0) return { ok: false, error: "Not found" };
  return { ok: true };
}

/** Any member may claim an OPEN contract. */
export async function claimContractCore(
  tenantId: string, membershipId: string, id: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  const c = await db(ctx).contract.findFirst({ where: { id }, select: { status: true } });
  if (!c) return { ok: false, error: "Not found" };
  if (c.status !== "OPEN") return { ok: false, error: "Already claimed" };
  // Conditional update guards against a concurrent claim race.
  const res = await db(ctx).contract.updateMany({
    where: { id, status: "OPEN" },
    data: { status: "CLAIMED", claimedById: membershipId },
  });
  if (res.count !== 1) return { ok: false, error: "Already claimed" };
  return { ok: true };
}

/** The claimant or an OFFICER may release a claim. */
export async function unclaimContractCore(
  tenantId: string, membershipId: string, tier: RankTier, id: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  const c = await db(ctx).contract.findFirst({ where: { id }, select: { claimedById: true } });
  if (!c) return { ok: false, error: "Not found" };
  if (c.claimedById !== membershipId && !hasTier(tier, "OFFICER")) {
    return { ok: false, error: "Only the claimant or an officer can release this" };
  }
  await db(ctx).contract.updateMany({ where: { id }, data: { status: "OPEN", claimedById: null } });
  return { ok: true };
}
