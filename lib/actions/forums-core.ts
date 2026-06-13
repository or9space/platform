import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const DUPE_WINDOW_MS = 15_000;

const ThreadSchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
});

export async function createThreadCore(
  tenantId: string,
  membershipId: string,
  input: z.infer<typeof ThreadSchema>,
): Promise<Result<{ threadId: string }>> {
  const parsed = ThreadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { categoryId, title, content } = parsed.data;
  const ctx = makeTenantContext(tenantId);

  const { allowed } = checkRateLimit(`forum:thread:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  // Category must belong to this tenant (db(ctx) auto-injects tenant_id into where)
  const category = await db(ctx).forumCategory.findFirst({ where: { id: categoryId }, select: { id: true } });
  if (!category) return { ok: false, error: "Category not found" };

  // Dupe guard: same author+category+title+content within window
  const since = new Date(Date.now() - DUPE_WINDOW_MS);
  const recent = await db(ctx).forumThread.findFirst({
    where: {
      authorMembershipId: membershipId,
      categoryId,
      title,
      createdAt: { gte: since },
      posts: { some: { content } },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (recent) return { ok: true, threadId: recent.id };

  // SECURITY: db(ctx).forumThread.create injects tenantId on the TOP-LEVEL row only.
  // The nested posts.create does NOT get tenantId auto-injected by the proxy.
  // ForumPost has a NOT NULL tenant_id column and an RLS WITH CHECK on tenant_id,
  // so we MUST supply tenantId explicitly in the nested create data.
  const thread = await db(ctx).forumThread.create({
    data: {
      tenantId,
      categoryId,
      authorMembershipId: membershipId,
      title,
      lastPostAt: new Date(),
      posts: {
        create: {
          tenantId,
          authorMembershipId: membershipId,
          content,
        },
      },
    },
    select: { id: true },
  });
  return { ok: true, threadId: thread.id };
}

const PostSchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(1).max(20000),
});

export async function createPostCore(
  tenantId: string,
  membershipId: string,
  input: z.infer<typeof PostSchema>,
): Promise<Result<{ postId: string }>> {
  const parsed = PostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { threadId, content } = parsed.data;
  const ctx = makeTenantContext(tenantId);

  const { allowed } = checkRateLimit(`forum:post:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  // db(ctx) scopes this to the correct tenant automatically
  const thread = await db(ctx).forumThread.findFirst({
    where: { id: threadId },
    select: { id: true, isLocked: true },
  });
  if (!thread) return { ok: false, error: "Thread not found" };
  if (thread.isLocked) return { ok: false, error: "Thread is locked" };

  // Dupe guard: identical content by same author within window
  const since = new Date(Date.now() - DUPE_WINDOW_MS);
  const dup = await db(ctx).forumPost.findFirst({
    where: { threadId, authorMembershipId: membershipId, content, createdAt: { gte: since } },
    select: { id: true },
  });
  if (dup) return { ok: true, postId: dup.id };

  // db(ctx).forumPost.create injects tenantId via the proxy; we also pass it
  // explicitly so the Prisma type checker is satisfied and the value is
  // unambiguous even if the proxy were bypassed in future.
  const post = await db(ctx).forumPost.create({
    data: { tenantId, threadId, authorMembershipId: membershipId, content },
    select: { id: true },
  });
  await db(ctx).forumThread.update({ where: { id: threadId }, data: { lastPostAt: new Date() } });
  return { ok: true, postId: post.id };
}

export async function editPostCore(
  tenantId: string,
  membershipId: string,
  postId: string,
  content: string,
): Promise<Result> {
  if (content.trim().length < 1 || content.length > 20000) return { ok: false, error: "Invalid content" };
  const ctx = makeTenantContext(tenantId);
  const post = await db(ctx).forumPost.findFirst({
    where: { id: postId },
    select: { authorMembershipId: true },
  });
  if (!post) return { ok: false, error: "Post not found" };
  if (post.authorMembershipId !== membershipId) return { ok: false, error: "You can only edit your own posts" };
  await db(ctx).forumPost.update({ where: { id: postId }, data: { content: content.trim(), isEdited: true } });
  return { ok: true };
}

export async function deletePostCore(
  tenantId: string,
  membershipId: string,
  viewerTier: RankTier,
  postId: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  const post = await db(ctx).forumPost.findFirst({
    where: { id: postId },
    select: { authorMembershipId: true, threadId: true, createdAt: true },
  });
  if (!post) return { ok: false, error: "Post not found" };

  // Never allow deleting the original (first) post — delete the thread instead
  const first = await db(ctx).forumPost.findFirst({
    where: { threadId: post.threadId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (first?.id === postId) {
    return { ok: false, error: "Cannot delete the original post — delete the thread instead" };
  }

  const isOwner = post.authorMembershipId === membershipId;
  if (!isOwner && !hasTier(viewerTier, "COMMAND")) {
    return { ok: false, error: "You can only delete your own posts" };
  }
  await db(ctx).forumPost.delete({ where: { id: postId } });
  return { ok: true };
}

export async function setThreadPinLockCore(
  tenantId: string,
  viewerTier: RankTier,
  threadId: string,
  patch: { isPinned?: boolean; isLocked?: boolean },
): Promise<Result> {
  if (!hasTier(viewerTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const ctx = makeTenantContext(tenantId);
  const thread = await db(ctx).forumThread.findFirst({
    where: { id: threadId },
    select: { id: true },
  });
  if (!thread) return { ok: false, error: "Thread not found" };
  await db(ctx).forumThread.update({ where: { id: threadId }, data: patch });
  return { ok: true };
}

const CategorySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(/^[a-z][a-z0-9-]{1,59}$/),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
});

export async function createCategoryCore(
  tenantId: string,
  viewerTier: RankTier,
  input: z.infer<typeof CategorySchema>,
): Promise<Result<{ categoryId: string }>> {
  if (!hasTier(viewerTier, "COMMAND")) return { ok: false, error: "Requires COMMAND" };
  const parsed = CategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  // Slug must be unique within tenant (db(ctx) scopes the check)
  const clash = await db(ctx).forumCategory.findFirst({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash) return { ok: false, error: "A category with that slug already exists" };
  const cat = await db(ctx).forumCategory.create({
    data: {
      tenantId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
    select: { id: true },
  });
  return { ok: true, categoryId: cat.id };
}

export async function deleteCategoryCore(
  tenantId: string,
  viewerTier: RankTier,
  categoryId: string,
): Promise<Result> {
  if (!hasTier(viewerTier, "COMMAND")) return { ok: false, error: "Requires COMMAND" };
  const ctx = makeTenantContext(tenantId);
  const cat = await db(ctx).forumCategory.findFirst({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!cat) return { ok: false, error: "Category not found" };
  await db(ctx).forumCategory.delete({ where: { id: categoryId } });
  return { ok: true };
}
