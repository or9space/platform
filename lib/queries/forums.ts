import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  threadCount: number;
  postCount: number;
  latestThread: { id: string; title: string; authorName: string; lastPostAt: Date | null } | null;
}

export async function getCategories(ctx: TenantContext): Promise<CategoryRow[]> {
  const cats = await db(ctx).forumCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, slug: true, description: true,
      _count: { select: { threads: true } },
      threads: {
        orderBy: [{ isPinned: "desc" }, { lastPostAt: "desc" }],
        take: 1,
        select: {
          id: true, title: true, lastPostAt: true,
          author: { select: { displayName: true, username: true } },
          _count: { select: { posts: true } },
        },
      },
    },
  });
  // Resolve total post count per category via raw aggregation — do it in JS to
  // avoid extra raw queries; postCount is derived from the sum of each thread's post count.
  // We only have the latest thread's post count here, so we need a second pass.
  const ids = cats.map((c) => c.id);
  const postAgg = ids.length > 0
    ? await db(ctx).forumPost.groupBy({
        by: ["threadId"],
        where: { thread: { categoryId: { in: ids } } },
        _count: { _all: true },
      })
    : [];
  // Build a category-level post count map
  const threadPostMap = new Map<string, number>(
    postAgg.map((r) => [r.threadId, r._count._all])
  );
  // We need thread→category mapping; fetch it if we have categories with threads
  const allThreadIds = cats.flatMap((c) => c.threads.map((t) => t.id));
  const threadCatMap = new Map<string, string>();
  if (allThreadIds.length > 0) {
    const threadRows = await db(ctx).forumThread.findMany({
      where: { categoryId: { in: ids } },
      select: { id: true, categoryId: true },
    });
    for (const r of threadRows) threadCatMap.set(r.id, r.categoryId);
  }
  const catPostCount = new Map<string, number>();
  for (const [tid, cnt] of threadPostMap) {
    const cid = threadCatMap.get(tid);
    if (cid) catPostCount.set(cid, (catPostCount.get(cid) ?? 0) + cnt);
  }

  return cats.map((c): CategoryRow => {
    const latest = c.threads[0];
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      threadCount: c._count.threads,
      postCount: catPostCount.get(c.id) ?? 0,
      latestThread: latest
        ? {
            id: latest.id,
            title: latest.title,
            lastPostAt: latest.lastPostAt,
            authorName: latest.author?.displayName ?? latest.author?.username ?? "Unknown",
          }
        : null,
    };
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

export interface RecentThread {
  id: string; title: string; categorySlug: string; categoryName: string;
  authorName: string; lastPostAt: Date | null; postCount: number;
}

/** Newest-active threads across all categories — for the org dashboard. */
export async function listRecentThreads(ctx: TenantContext, limit = 5): Promise<RecentThread[]> {
  const threads = await db(ctx).forumThread.findMany({
    orderBy: [{ lastPostAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true, title: true, lastPostAt: true,
      category: { select: { slug: true, name: true } },
      author: { select: { displayName: true, username: true } },
      _count: { select: { posts: true } },
    },
  });
  return threads.map((t) => ({
    id: t.id, title: t.title,
    categorySlug: t.category?.slug ?? "",
    categoryName: t.category?.name ?? "",
    authorName: t.author?.displayName ?? t.author?.username ?? "Unknown",
    lastPostAt: t.lastPostAt,
    postCount: t._count.posts,
  }));
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
