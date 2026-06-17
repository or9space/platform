import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";
import type { CommentEntity } from "@/lib/comment-entity";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const CommentBodySchema = z.string().min(1, "Comment cannot be empty").max(4000, "Comment too long (max 4000 chars)");

export async function postCommentCore(
  tenantId: string,
  membershipId: string,
  entityType: CommentEntity,
  entityId: string,
  body: string,
): Promise<Result<{ id: string }>> {
  const parsed = CommentBodySchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid comment" };

  const { allowed } = checkRateLimit(`comment:${tenantId}:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Posting too fast — try again in a minute" };

  const ctx = makeTenantContext(tenantId);
  const comment = await db(ctx).comment.create({
    data: {
      tenantId,
      entityType,
      entityId,
      body: parsed.data.trim(),
      authorId: membershipId,
    },
    select: { id: true },
  });

  return { ok: true, id: comment.id };
}

export async function deleteCommentCore(
  tenantId: string,
  membershipId: string,
  tier: RankTier,
  commentId: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  const comment = await db(ctx).comment.findFirst({
    where: { id: commentId },
    select: { id: true, authorId: true },
  });

  if (!comment) return { ok: false, error: "Comment not found" };

  const isAuthor = comment.authorId === membershipId;
  const isModerator = hasTier(tier, "OFFICER");

  if (!isAuthor && !isModerator) {
    return { ok: false, error: "You can only delete your own comments" };
  }

  await db(ctx).comment.delete({ where: { id: commentId } });
  return { ok: true };
}
