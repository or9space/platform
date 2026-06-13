import { db } from "../db";
import type { TenantContext } from "../tenant";

export async function getCategories(ctx: TenantContext) {
  return db(ctx).forumCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, description: true },
  });
}

export interface ThreadRow {
  id: string; title: string; isPinned: boolean; isLocked: boolean;
  createdAt: Date; lastPostAt: Date | null; authorName: string; postCount: number;
}

export async function getThreadsByCategory(ctx: TenantContext, slug: string) {
  const category = await db(ctx).forumCategory.findFirst({
    where: { slug }, select: { id: true, name: true, description: true },
  });
  if (!category) return null;
  const threads = await db(ctx).forumThread.findMany({
    where: { categoryId: category.id },
    orderBy: [{ isPinned: "desc" }, { lastPostAt: "desc" }],
    select: {
      id: true, title: true, isPinned: true, isLocked: true, createdAt: true, lastPostAt: true,
      author: { select: { displayName: true, username: true } },
      _count: { select: { posts: true } },
    },
  });
  const rows: ThreadRow[] = threads.map((t) => ({
    id: t.id, title: t.title, isPinned: t.isPinned, isLocked: t.isLocked,
    createdAt: t.createdAt, lastPostAt: t.lastPostAt,
    authorName: t.author?.displayName ?? t.author?.username ?? "Unknown",
    postCount: t._count.posts,
  }));
  return { category, threads: rows };
}

export interface PostRow {
  id: string; content: string; isEdited: boolean; createdAt: Date;
  authorMembershipId: string; authorName: string;
}

export async function getThread(ctx: TenantContext, threadId: string) {
  const thread = await db(ctx).forumThread.findFirst({
    where: { id: threadId },
    select: {
      id: true, title: true, isPinned: true, isLocked: true, categoryId: true,
      category: { select: { slug: true } },
      author: { select: { displayName: true, username: true } },
      posts: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, content: true, isEdited: true, createdAt: true, authorMembershipId: true,
          author: { select: { displayName: true, username: true } },
        },
      },
    },
  });
  if (!thread) return null;
  return {
    ...thread,
    posts: thread.posts.map((p): PostRow => ({
      id: p.id, content: p.content, isEdited: p.isEdited, createdAt: p.createdAt,
      authorMembershipId: p.authorMembershipId,
      authorName: p.author?.displayName ?? p.author?.username ?? "Unknown",
    })),
  };
}

export async function searchThreads(ctx: TenantContext, query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  return db(ctx).forumThread.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    orderBy: { lastPostAt: "desc" },
    take: 30,
    select: { id: true, title: true, categoryId: true, category: { select: { slug: true } } },
  });
}
