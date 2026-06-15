import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const STATUSES = ["ALLY", "NEUTRAL", "HOSTILE", "PENDING"] as const;

const AllianceSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(STATUSES).optional(),
  link: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
});

export interface AllianceInput {
  name: string;
  description?: string | null;
  status?: string;
  link?: string | null;
}

function requireOfficer(tier: RankTier): Result {
  return hasTier(tier, "OFFICER") ? { ok: true } : { ok: false, error: "Requires OFFICER+ in this org" };
}

export async function createAllianceCore(
  tenantId: string, membershipId: string, tier: RankTier, input: AllianceInput,
): Promise<Result<{ id: string }>> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = AllianceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { allowed } = checkRateLimit(`alliance:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;
  const a = await db(ctx).alliance.create({
    data: { tenantId, name: d.name, description: d.description ?? null, status: d.status ?? "ALLY", link: d.link ?? null, createdById: membershipId },
    select: { id: true },
  });
  return { ok: true, id: a.id };
}

export async function deleteAllianceCore(
  tenantId: string, _membershipId: string, tier: RankTier, id: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).alliance.deleteMany({ where: { id } });
  if (res.count === 0) return { ok: false, error: "Not found" };
  return { ok: true };
}
