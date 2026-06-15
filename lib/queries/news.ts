import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface NewsRow {
  id: string;
  title: string;
  category: string;
  isPinned: boolean;
  authorName: string;
  createdAt: Date;
}

export interface NewsDetail extends NewsRow {
  body: string;
}

const LIST_SELECT = {
  id: true, title: true, category: true, isPinned: true, createdAt: true,
  author: { select: { displayName: true, username: true } },
};

function toRow(p: {
  id: string; title: string; category: string; isPinned: boolean; createdAt: Date;
  author: { displayName: string | null; username: string } | null;
}): NewsRow {
  return {
    id: p.id, title: p.title, category: p.category, isPinned: p.isPinned, createdAt: p.createdAt,
    authorName: p.author?.displayName ?? p.author?.username ?? "Unknown",
  };
}

/** Pinned first, then newest. */
export async function listNews(ctx: TenantContext, limit = 50): Promise<NewsRow[]> {
  const rows = await db(ctx).newsPost.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: LIST_SELECT,
  });
  return rows.map(toRow);
}

/** Newest announcements for the dashboard. */
export async function latestNews(ctx: TenantContext, limit = 3): Promise<NewsRow[]> {
  const rows = await db(ctx).newsPost.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: LIST_SELECT,
  });
  return rows.map(toRow);
}

export async function getNews(ctx: TenantContext, id: string): Promise<NewsDetail | null> {
  const p = await db(ctx).newsPost.findFirst({
    where: { id },
    select: { ...LIST_SELECT, body: true },
  });
  if (!p) return null;
  return { ...toRow(p), body: p.body };
}
