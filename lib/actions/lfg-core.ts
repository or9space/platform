import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const LfgSchema = z.object({
  title: z.string().min(2).max(160),
  body: z.string().max(5000).nullable().optional(),
});

export interface LfgInput {
  title: string;
  body?: string | null;
}

/** Any member may post. */
export async function createLfgCore(
  tenantId: string, membershipId: string, input: LfgInput,
): Promise<Result<{ id: string }>> {
  const parsed = LfgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { allowed } = checkRateLimit(`lfg:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;
  const p = await db(ctx).lfgPost.create({
    data: { tenantId, title: d.title, body: d.body ?? null, authorId: membershipId },
    select: { id: true },
  });
  return { ok: true, id: p.id };
}

/** Author or OFFICER+ may mutate. */
async function authorOrOfficer(
  tenantId: string, membershipId: string, tier: RankTier, id: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  const post = await db(ctx).lfgPost.findFirst({ where: { id }, select: { authorId: true } });
  if (!post) return { ok: false, error: "Not found" };
  if (post.authorId !== membershipId && !hasTier(tier, "OFFICER")) {
    return { ok: false, error: "Only the author or an officer can do that" };
  }
  return { ok: true };
}

export async function closeLfgCore(
  tenantId: string, membershipId: string, tier: RankTier, id: string,
): Promise<Result> {
  const g = await authorOrOfficer(tenantId, membershipId, tier, id);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  await db(ctx).lfgPost.updateMany({ where: { id }, data: { status: "CLOSED" } });
  return { ok: true };
}

export async function deleteLfgCore(
  tenantId: string, membershipId: string, tier: RankTier, id: string,
): Promise<Result> {
  const g = await authorOrOfficer(tenantId, membershipId, tier, id);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  await db(ctx).lfgPost.deleteMany({ where: { id } });
  return { ok: true };
}
