import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const ResourceSchema = z.object({
  title: z.string().min(2).max(160),
  url: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  body: z.string().max(10000).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
});

export interface ResourceInput {
  title: string;
  url?: string | null;
  body?: string | null;
  category?: string | null;
}

function requireOfficer(tier: RankTier): Result {
  return hasTier(tier, "OFFICER") ? { ok: true } : { ok: false, error: "Requires OFFICER+ in this org" };
}

export async function createResourceCore(
  tenantId: string, membershipId: string, tier: RankTier, input: ResourceInput,
): Promise<Result<{ id: string }>> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = ResourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { allowed } = checkRateLimit(`resource:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;
  const r = await db(ctx).resource.create({
    data: { tenantId, title: d.title, url: d.url ?? null, body: d.body ?? null, category: d.category ?? null, createdById: membershipId },
    select: { id: true },
  });
  return { ok: true, id: r.id };
}

export async function deleteResourceCore(
  tenantId: string, _membershipId: string, tier: RankTier, id: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).resource.deleteMany({ where: { id } });
  if (res.count === 0) return { ok: false, error: "Not found" };
  return { ok: true };
}
