import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function requireOfficer(tier: RankTier): Result {
  return hasTier(tier, "OFFICER") ? { ok: true } : { ok: false, error: "Requires OFFICER+ in this org" };
}

const AwardSchema = z.object({ name: z.string().min(2).max(120), description: z.string().max(2000).nullable().optional() });
export interface AwardInput { name: string; description?: string | null }

export async function createAwardCore(
  tenantId: string, membershipId: string, tier: RankTier, input: AwardInput,
): Promise<Result<{ id: string }>> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = AwardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { allowed } = checkRateLimit(`award:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };
  const ctx = makeTenantContext(tenantId);
  const a = await db(ctx).award.create({
    data: { tenantId, name: parsed.data.name, description: parsed.data.description ?? null, createdById: membershipId },
    select: { id: true },
  });
  return { ok: true, id: a.id };
}

export async function deleteAwardCore(
  tenantId: string, _membershipId: string, tier: RankTier, id: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).award.deleteMany({ where: { id } });
  if (res.count === 0) return { ok: false, error: "Not found" };
  return { ok: true };
}

const GrantSchema = z.object({
  awardId: z.string().min(1),
  username: z.string().min(1).max(60),
  note: z.string().max(300).nullable().optional(),
});

export async function grantAwardCore(
  tenantId: string, membershipId: string, tier: RankTier, input: z.infer<typeof GrantSchema>,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = GrantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { awardId, username, note } = parsed.data;
  const ctx = makeTenantContext(tenantId);

  const award = await db(ctx).award.findFirst({ where: { id: awardId }, select: { id: true } });
  if (!award) return { ok: false, error: "Award not found" };
  const member = await db(ctx).membership.findFirst({ where: { username }, select: { id: true } });
  if (!member) return { ok: false, error: `No member named "${username}"` };

  await db(ctx).memberAward.upsert({
    where: { awardId_membershipId: { awardId, membershipId: member.id } },
    create: { tenantId, awardId, membershipId: member.id, note: note ?? null, awardedById: membershipId },
    update: { note: note ?? null },
  });
  return { ok: true };
}

export async function revokeAwardCore(
  tenantId: string, _membershipId: string, tier: RankTier, awardId: string, recipientMembershipId: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  await db(ctx).memberAward.deleteMany({ where: { awardId, membershipId: recipientMembershipId } });
  return { ok: true };
}
