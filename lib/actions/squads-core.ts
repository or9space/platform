import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function requireOfficer(tier: RankTier): Result {
  return hasTier(tier, "OFFICER") ? { ok: true } : { ok: false, error: "Requires OFFICER+ in this org" };
}

const SquadSchema = z.object({ name: z.string().min(2).max(120), description: z.string().max(2000).nullable().optional() });
export interface SquadInput { name: string; description?: string | null }

export async function createSquadCore(
  tenantId: string, membershipId: string, tier: RankTier, input: SquadInput,
): Promise<Result<{ id: string }>> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = SquadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { allowed } = checkRateLimit(`squad:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };
  const ctx = makeTenantContext(tenantId);
  const s = await db(ctx).squad.create({
    data: { tenantId, name: parsed.data.name, description: parsed.data.description ?? null, createdById: membershipId },
    select: { id: true },
  });
  return { ok: true, id: s.id };
}

export async function deleteSquadCore(
  tenantId: string, _membershipId: string, tier: RankTier, id: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).squad.deleteMany({ where: { id } });
  if (res.count === 0) return { ok: false, error: "Not found" };
  return { ok: true };
}

const AddSchema = z.object({
  squadId: z.string().min(1),
  username: z.string().min(1).max(60),
  role: z.string().max(80).nullable().optional(),
});

export async function addSquadMemberCore(
  tenantId: string, _membershipId: string, tier: RankTier, input: z.infer<typeof AddSchema>,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = AddSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { squadId, username, role } = parsed.data;
  const ctx = makeTenantContext(tenantId);

  const squad = await db(ctx).squad.findFirst({ where: { id: squadId }, select: { id: true } });
  if (!squad) return { ok: false, error: "Squad not found" };
  const member = await db(ctx).membership.findFirst({ where: { username }, select: { id: true } });
  if (!member) return { ok: false, error: `No member named "${username}"` };

  await db(ctx).squadMember.upsert({
    where: { squadId_membershipId: { squadId, membershipId: member.id } },
    create: { tenantId, squadId, membershipId: member.id, role: role ?? null },
    update: { role: role ?? null },
  });
  return { ok: true };
}

export async function removeSquadMemberCore(
  tenantId: string, _membershipId: string, tier: RankTier, squadId: string, memberMembershipId: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  await db(ctx).squadMember.deleteMany({ where: { squadId, membershipId: memberMembershipId } });
  return { ok: true };
}
