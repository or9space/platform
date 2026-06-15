import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const GallerySchema = z.object({
  imageUrl: z.string().url().max(1000),
  title: z.string().max(160).nullable().optional(),
  caption: z.string().max(2000).nullable().optional(),
});
export interface GalleryInput { imageUrl: string; title?: string | null; caption?: string | null }

/** Any member may post an image. */
export async function createGalleryCore(
  tenantId: string, membershipId: string, input: GalleryInput,
): Promise<Result<{ id: string }>> {
  const parsed = GallerySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "A valid image URL is required" };
  const { allowed } = checkRateLimit(`gallery:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };
  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;
  const g = await db(ctx).galleryItem.create({
    data: { tenantId, imageUrl: d.imageUrl, title: d.title ?? null, caption: d.caption ?? null, createdById: membershipId },
    select: { id: true },
  });
  return { ok: true, id: g.id };
}

/** Author or OFFICER+ may delete. */
export async function deleteGalleryCore(
  tenantId: string, membershipId: string, tier: RankTier, id: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  const item = await db(ctx).galleryItem.findFirst({ where: { id }, select: { createdById: true } });
  if (!item) return { ok: false, error: "Not found" };
  if (item.createdById !== membershipId && !hasTier(tier, "OFFICER")) {
    return { ok: false, error: "Only the author or an officer can delete this" };
  }
  await db(ctx).galleryItem.deleteMany({ where: { id } });
  return { ok: true };
}
