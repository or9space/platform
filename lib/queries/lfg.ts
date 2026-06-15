import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface LfgRow {
  id: string;
  title: string;
  body: string | null;
  status: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  createdAt: Date;
}

export async function listLfg(ctx: TenantContext): Promise<LfgRow[]> {
  const rows = await db(ctx).lfgPost.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, body: true, status: true, authorId: true, createdAt: true,
      author: { select: { displayName: true, username: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id, title: p.title, body: p.body, status: p.status, authorId: p.authorId, createdAt: p.createdAt,
    authorName: p.author?.displayName ?? p.author?.username ?? "Unknown",
    authorUsername: p.author?.username ?? "",
  }));
}
