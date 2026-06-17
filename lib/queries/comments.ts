import { db } from "../db";
import type { TenantContext } from "../tenant";
import type { CommentEntity } from "@/lib/comment-entity";

export interface CommentRow {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  createdAt: Date;
}

export async function listComments(
  ctx: TenantContext,
  entityType: CommentEntity,
  entityId: string,
): Promise<CommentRow[]> {
  const rows = await db(ctx).comment.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      authorId: true,
      createdAt: true,
      author: {
        select: { displayName: true, username: true },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    authorId: r.authorId,
    authorName: r.author?.displayName ?? r.author?.username ?? "Unknown",
    authorUsername: r.author?.username ?? "",
    createdAt: r.createdAt,
  }));
}
