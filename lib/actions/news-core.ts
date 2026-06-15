import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const CATEGORIES = ["ANNOUNCEMENT", "PATCH_NOTES", "COMMUNITY", "GUIDE"] as const;

const NewsSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(1).max(20000),
  category: z.enum(CATEGORIES),
  isPinned: z.boolean().optional(),
});

export interface NewsInput {
  title: string;
  body: string;
  category: string;
  isPinned?: boolean;
}

function requireOfficer(tier: RankTier): Result {
  return hasTier(tier, "OFFICER") ? { ok: true } : { ok: false, error: "Requires OFFICER+ in this org" };
}

export async function createNewsCore(
  tenantId: string, membershipId: string, tier: RankTier, input: NewsInput,
): Promise<Result<{ postId: string }>> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = NewsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { allowed } = checkRateLimit(`news:create:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;
  const post = await db(ctx).newsPost.create({
    data: { tenantId, title: d.title, body: d.body, category: d.category, isPinned: d.isPinned ?? false, authorId: membershipId },
    select: { id: true },
  });
  return { ok: true, postId: post.id };
}

export async function updateNewsCore(
  tenantId: string, _membershipId: string, tier: RankTier, postId: string, input: NewsInput,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = NewsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;
  const res = await db(ctx).newsPost.updateMany({
    where: { id: postId },
    data: { title: d.title, body: d.body, category: d.category, isPinned: d.isPinned ?? false },
  });
  if (res.count === 0) return { ok: false, error: "Post not found" };
  return { ok: true };
}

export async function deleteNewsCore(
  tenantId: string, _membershipId: string, tier: RankTier, postId: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).newsPost.deleteMany({ where: { id: postId } });
  if (res.count === 0) return { ok: false, error: "Post not found" };
  return { ok: true };
}
