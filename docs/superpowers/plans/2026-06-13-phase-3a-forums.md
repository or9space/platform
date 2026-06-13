# Phase 3a — Forums Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** Replace the Phase 2 forums stub with a real multi-tenant forum: per-tenant categories, threads, posts; create/reply (with double-submit guard), edit/delete, pin/lock (OFFICER+), category management (COMMAND), and search — all tenant-isolated (RLS), flag-gated (`forums`), and authored by the viewer's per-tenant Membership.

**Architecture:** Three new tenant-scoped tables (`forum_categories`, `forum_threads`, `forum_posts`) with `tenant_id` + RLS policies. All reads/writes go through `db(ctx)` (auto-injects tenant_id + sets `app.tenant_id` under prod RLS). Interactive write transactions call `setTenantContext` first (Phase 1.5 pattern). Authorship references `Membership.id` (per-tenant identity). Server-action cores take explicit `(tenantId, membershipId, …)` for testability; `"use server"` wrappers resolve session→account→membership and enforce tier.

**Tech Stack:** Next 16, Prisma 6, RLS (app_user prod), Vitest 4. Reuses Phase 1 `setTenantContext`, Phase 2 `getViewerMembership`/`requireTier`/`getFullTenantContext`, `<L>`, the `forums` flag gate (already at `app/forums/layout.tsx`).

**Spec ref:** program spec §6 (forums content types under the `forums` flag). Faithful port of FreedomGuard `forum_categories`/`forum_threads`/`forum_posts` + the double-submit dupe guard shipped to FG.

**Branch:** `feat/phase-3a-forums`.

**Scope cut:** custom-field VALUES on threads are NOT in 3a. The `custom_field_value` table + render/store/display is shared infra across all content types — it gets its own task once the first content type lands. 3a ships forums-core. (Custom-field DEFS already exist from Phase 2; they're just not wired to thread values yet.)

**Environment (every task):** `C:\Projects\platform`, PowerShell only. Dev DB `or9-pg` :5434. 113 tests green at start. Gates: `pnpm test`, `pnpm lint`, `pnpm lint:rule-test`, `pnpm exec tsc --noEmit`; UI tasks also `pnpm build`. Conventional commits, David Smereski, do NOT push (controller batches PR). RLS: forum_* tables are tenant-scoped → ALWAYS `db(ctx)`, never `prismaGlobal`. Membership reads via `db(ctx)`. The ESLint `or9/no-untenanted-query` rule must stay green.

---

## File Structure (additions)

```
prisma/
  schema.prisma                         ← +ForumCategory/Thread/Post, +Membership.authoredThreads/Posts relations
  migrations/<ts>_phase3a_forums/
  rls/policies.sql                      ← +3 forum tables (ENABLE+FORCE+policy)
lib/
  queries/forums.ts                     ← getCategories, getThreadsByCategory, getThread, searchThreads
  actions/forums-core.ts                ← createThread/Post, edit/deletePost, pin/lock, category CRUD (explicit ids)
  actions/forums.ts                     ← "use server" wrappers (session→membership→tier)
app/forums/
  page.tsx                              ← REPLACE stub: category list
  [categorySlug]/page.tsx               ← thread list + new-thread form
  [categorySlug]/new-thread-form.tsx
  [categorySlug]/[threadId]/page.tsx    ← thread view + posts + reply
  [categorySlug]/[threadId]/reply-form.tsx
  [categorySlug]/[threadId]/post-actions.tsx   ← edit/delete/pin/lock
  admin-categories/page.tsx             ← COMMAND category management (under /forums for now)
  admin-categories/category-manager.tsx
scripts/tenant-leak-fuzzer.ts           ← +forum_thread/forum_post probes
tests/
  integration/forums.test.ts
  integration/forums-rls.test.ts        ← forum rows isolated under app_user
```

---

## Task 0: Branch

- [ ] `cd C:\Projects\platform; git checkout main; git pull origin main; git checkout -b feat/phase-3a-forums`. Confirm `pnpm test` = 113 green.

---

## Task 1: Schema + RLS + migration

**Files:** `prisma/schema.prisma`, migration, `prisma/rls/policies.sql`

- [ ] **Step 1: Append to `prisma/schema.prisma`:**

```prisma
model ForumCategory {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")
  name        String   @db.VarChar(120)
  slug        String   @db.VarChar(60)
  description String?  @db.VarChar(500)
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")

  threads ForumThread[]

  @@unique([tenantId, slug])
  @@index([tenantId, sortOrder])
  @@map("forum_categories")
}

model ForumThread {
  id                 String    @id @default(cuid())
  tenantId           String    @map("tenant_id")
  categoryId         String    @map("category_id")
  authorMembershipId String    @map("author_membership_id")
  title              String    @db.VarChar(200)
  isPinned           Boolean   @default(false) @map("is_pinned")
  isLocked           Boolean   @default(false) @map("is_locked")
  viewCount          Int       @default(0) @map("view_count")
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")
  lastPostAt         DateTime? @map("last_post_at")

  category ForumCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  author   Membership    @relation("threadAuthor", fields: [authorMembershipId], references: [id], onDelete: Cascade)
  posts    ForumPost[]

  @@index([tenantId, categoryId])
  @@index([tenantId, lastPostAt(sort: Desc)])
  @@map("forum_threads")
}

model ForumPost {
  id                 String   @id @default(cuid())
  tenantId           String   @map("tenant_id")
  threadId           String   @map("thread_id")
  authorMembershipId String   @map("author_membership_id")
  content            String   @db.VarChar(20000)
  isEdited           Boolean  @default(false) @map("is_edited")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  thread ForumThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  author Membership  @relation("postAuthor", fields: [authorMembershipId], references: [id], onDelete: Cascade)

  @@index([tenantId, threadId, createdAt])
  @@map("forum_posts")
}
```

Add to the `Membership` model relations:

```prisma
  authoredThreads ForumThread[] @relation("threadAuthor")
  authoredPosts   ForumPost[]   @relation("postAuthor")
```

- [ ] **Step 2:** `pnpm exec prisma migrate dev --name phase3a_forums`. Expect applied + "in sync".

- [ ] **Step 3: Add RLS policies** — append to `prisma/rls/policies.sql` (3 stanzas, same FORCE template as memberships):

```sql
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON forum_categories;
CREATE POLICY tenant_isolation ON forum_categories
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON forum_threads;
CREATE POLICY tenant_isolation ON forum_threads
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON forum_posts;
CREATE POLICY tenant_isolation ON forum_posts
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
```

- [ ] **Step 4: Apply RLS to dev DB:** `$env:APP_USER_PASSWORD="rls-test-password-1"; pnpm db:setup-rls` — expect "RLS roles + policies applied".

- [ ] **Step 5:** `pnpm test` (113 still green — db.test.ts unaffected), `pnpm exec tsc --noEmit` clean. NOTE: `lib/db.ts` GLOBAL_TABLES must NOT list forum tables (they're tenant-scoped) — confirm they're absent.

- [ ] **Step 6: Commit** `feat(forums): schema + RLS for tenant-scoped categories/threads/posts`

---

## Task 2: Forum queries (TDD)

**Files:** `lib/queries/forums.ts`, `tests/integration/forums.test.ts` (queries portion)

All queries take a `TenantContext` and use `db(ctx)`. Author display joins Membership.

- [ ] **Step 1: Failing integration test** (create `tests/integration/forums.test.ts` with the QUERY tests; action tests come in Task 3 — but write the file now with query tests, extend in T3):

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { getCategories, getThreadsByCategory, getThread, searchThreads } from "@/lib/queries/forums";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = makeTenantContext(TENANT_A.id);

async function seedForum() {
  const acc = await testPrisma.account.create({ data: { email: "f@it-test.example" } });
  const mA = await testPrisma.membership.create({ data: { accountId: acc.id, tenantId: TENANT_A.id, username: "fa", displayName: "Forum A" } });
  const catA = await testPrisma.forumCategory.create({ data: { tenantId: TENANT_A.id, name: "General", slug: "general", sortOrder: 0 } });
  const thread = await testPrisma.forumThread.create({
    data: { tenantId: TENANT_A.id, categoryId: catA.id, authorMembershipId: mA.id, title: "Hello world thread", lastPostAt: new Date() },
  });
  await testPrisma.forumPost.create({ data: { tenantId: TENANT_A.id, threadId: thread.id, authorMembershipId: mA.id, content: "first post body" } });
  // tenant B noise that must never appear for ctxA
  const accB = await testPrisma.account.create({ data: { email: "fb@it-test.example" } });
  const mB = await testPrisma.membership.create({ data: { accountId: accB.id, tenantId: TENANT_B.id, username: "fb" } });
  const catB = await testPrisma.forumCategory.create({ data: { tenantId: TENANT_B.id, name: "BravoCat", slug: "general", sortOrder: 0 } });
  await testPrisma.forumThread.create({ data: { tenantId: TENANT_B.id, categoryId: catB.id, authorMembershipId: mB.id, title: "BRAVO SECRET THREAD", lastPostAt: new Date() } });
  return { catA, thread };
}

describe("forum queries", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.forumPost.deleteMany({});
    await testPrisma.forumThread.deleteMany({});
    await testPrisma.forumCategory.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("getCategories returns only this tenant's categories", async () => {
    await seedForum();
    const cats = await getCategories(ctxA);
    expect(cats.map((c) => c.name)).toEqual(["General"]);   // not BravoCat
  });

  it("getThreadsByCategory returns threads + author + post count, tenant-scoped", async () => {
    const { catA } = await seedForum();
    const r = await getThreadsByCategory(ctxA, "general");
    expect(r?.category.name).toBe("General");
    expect(r?.threads).toHaveLength(1);
    expect(r?.threads[0].title).toBe("Hello world thread");
    expect(r?.threads[0].authorName).toBe("Forum A");
    expect(r?.threads[0].postCount).toBe(1);
  });

  it("getThread returns thread + posts with author names", async () => {
    const { thread } = await seedForum();
    const t = await getThread(ctxA, thread.id);
    expect(t?.title).toBe("Hello world thread");
    expect(t?.posts[0].content).toBe("first post body");
    expect(t?.posts[0].authorName).toBe("Forum A");
  });

  it("getThread returns null for another tenant's thread id", async () => {
    await seedForum();
    const bravo = await testPrisma.forumThread.findFirst({ where: { tenantId: TENANT_B.id } });
    const t = await getThread(ctxA, bravo!.id);
    expect(t).toBeNull();
  });

  it("searchThreads matches title within tenant only", async () => {
    await seedForum();
    const hits = await searchThreads(ctxA, "hello");
    expect(hits).toHaveLength(1);
    const leak = await searchThreads(ctxA, "BRAVO");
    expect(leak).toHaveLength(0);
  });
});
```

- [ ] **Step 2:** red. Report.

- [ ] **Step 3: Implement `lib/queries/forums.ts`:**

```ts
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
```

- [ ] **Step 4:** green (118). lint + tsc clean.
- [ ] **Step 5: Commit** `feat(forums): tenant-scoped queries (categories/threads/thread/search)`

---

## Task 3: Forum write actions (TDD) — SECURITY-CRITICAL

**Files:** `lib/actions/forums-core.ts`, extend `tests/integration/forums.test.ts`

Cores take `(tenantId, membershipId, viewerTier, …)`. RLS: wrap multi-statement writes in `db(ctx)` calls (the proxy + withTenantRls handles context). For interactive `$transaction` use `prismaGlobal.$transaction` + `setTenantContext` (Phase 1.5 pattern) since `db(ctx)` doesn't expose `$transaction`. Decision: use db(ctx) single calls where possible; for createThread (thread+post atomic) use a nested write (Prisma `posts: { create }`) so it's ONE db(ctx).forumThread.create call (auto-tenant-injected on the thread; the nested post needs tenantId too — see note).

NOTE on nested create + tenantId: `db(ctx).forumThread.create({ data: { …, posts: { create: { … } } } })` — the proxy injects tenantId at the TOP level (thread) but NOT into the nested `posts.create`. The forum_posts RLS WITH CHECK needs tenant_id. So either (a) set it explicitly in the nested create data, or (b) do two calls. Choose (a): pass `tenantId: ctx.tenantId` explicitly inside the nested post create. The proxy still injects the thread's tenantId; we add the post's manually. Document this.

- [ ] **Step 1: Failing tests** — append to `tests/integration/forums.test.ts`:

```ts
import {
  createThreadCore, createPostCore, editPostCore, deletePostCore, setThreadPinLockCore,
  createCategoryCore,
} from "@/lib/actions/forums-core";
import { _resetRateLimitStore } from "@/lib/rate-limit";

describe("forum write actions", () => {
  let mA: string;       // membership id (ENLISTED) in tenant A
  let catId: string;
  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    await testPrisma.forumPost.deleteMany({});
    await testPrisma.forumThread.deleteMany({});
    await testPrisma.forumCategory.deleteMany({});
    await seedTwoTenants();
    const acc = await testPrisma.account.create({ data: { email: "w@it-test.example" } });
    mA = (await testPrisma.membership.create({ data: { accountId: acc.id, tenantId: TENANT_A.id, username: "wa", displayName: "Writer", tier: "ENLISTED" } })).id;
    catId = (await testPrisma.forumCategory.create({ data: { tenantId: TENANT_A.id, name: "General", slug: "general" } })).id;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("createThread makes a thread + first post", async () => {
    const r = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "My thread", content: "body here" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const t = await testPrisma.forumThread.findUnique({ where: { id: r.threadId }, include: { posts: true } });
    expect(t?.tenantId).toBe(TENANT_A.id);
    expect(t?.posts).toHaveLength(1);
    expect(t?.posts[0].tenantId).toBe(TENANT_A.id);
  });

  it("createThread dupe guard: identical title+content within 15s makes ONE thread", async () => {
    const a = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "Dup", content: "same" });
    const b = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "Dup", content: "same" });
    expect(a.ok && b.ok).toBe(true);
    const count = await testPrisma.forumThread.count({ where: { title: "Dup" } });
    expect(count).toBe(1);
  });

  it("createThread rejects a category from another tenant", async () => {
    const catB = await testPrisma.forumCategory.create({ data: { tenantId: TENANT_B.id, name: "B", slug: "bcat" } });
    const r = await createThreadCore(TENANT_A.id, mA, { categoryId: catB.id, title: "x", content: "y" });
    expect(r.ok).toBe(false);
  });

  it("createPost appends; dupe guard collapses identical", async () => {
    const th = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "T", content: "op" });
    if (!th.ok) throw new Error();
    const p1 = await createPostCore(TENANT_A.id, mA, { threadId: th.threadId, content: "reply" });
    const p2 = await createPostCore(TENANT_A.id, mA, { threadId: th.threadId, content: "reply" });
    expect(p1.ok && p2.ok).toBe(true);
    const posts = await testPrisma.forumPost.count({ where: { threadId: th.threadId } });
    expect(posts).toBe(2); // OP + one reply (the dup collapsed)
  });

  it("createPost rejected on a locked thread", async () => {
    const th = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "L", content: "op" });
    if (!th.ok) throw new Error();
    await testPrisma.forumThread.update({ where: { id: th.threadId }, data: { isLocked: true } });
    const r = await createPostCore(TENANT_A.id, mA, { threadId: th.threadId, content: "no" });
    expect(r.ok).toBe(false);
  });

  it("editPost only by author", async () => {
    const th = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "E", content: "op" });
    if (!th.ok) throw new Error();
    const post = await testPrisma.forumPost.findFirst({ where: { threadId: th.threadId } });
    const ok = await editPostCore(TENANT_A.id, mA, post!.id, "edited");
    expect(ok.ok).toBe(true);
    const accX = await testPrisma.account.create({ data: { email: "x@it-test.example" } });
    const mX = (await testPrisma.membership.create({ data: { accountId: accX.id, tenantId: TENANT_A.id, username: "wx", tier: "ENLISTED" } })).id;
    const bad = await editPostCore(TENANT_A.id, mX, post!.id, "hijack");
    expect(bad.ok).toBe(false);
  });

  it("deletePost: author can delete a reply, but not the OP", async () => {
    const th = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "D", content: "op" });
    if (!th.ok) throw new Error();
    const reply = await createPostCore(TENANT_A.id, mA, { threadId: th.threadId, content: "reply" });
    const replyRow = await testPrisma.forumPost.findFirst({ where: { threadId: th.threadId, content: "reply" } });
    const okDel = await deletePostCore(TENANT_A.id, mA, "ENLISTED", replyRow!.id);
    expect(okDel.ok).toBe(true);
    const op = await testPrisma.forumPost.findFirst({ where: { threadId: th.threadId }, orderBy: { createdAt: "asc" } });
    const badDel = await deletePostCore(TENANT_A.id, mA, "ENLISTED", op!.id);
    expect(badDel.ok).toBe(false); // can't delete OP
  });

  it("pin/lock requires OFFICER+", async () => {
    const th = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "P", content: "op" });
    if (!th.ok) throw new Error();
    const denied = await setThreadPinLockCore(TENANT_A.id, "ENLISTED", th.threadId, { isPinned: true });
    expect(denied.ok).toBe(false);
    const allowed = await setThreadPinLockCore(TENANT_A.id, "OFFICER", th.threadId, { isPinned: true });
    expect(allowed.ok).toBe(true);
    const t = await testPrisma.forumThread.findUnique({ where: { id: th.threadId } });
    expect(t?.isPinned).toBe(true);
  });

  it("createCategory requires COMMAND", async () => {
    const denied = await createCategoryCore(TENANT_A.id, "OFFICER", { name: "New", slug: "new" });
    expect(denied.ok).toBe(false);
    const allowed = await createCategoryCore(TENANT_A.id, "COMMAND", { name: "New", slug: "new" });
    expect(allowed.ok).toBe(true);
  });
});
```

- [ ] **Step 2:** red. Report.

- [ ] **Step 3: Implement `lib/actions/forums-core.ts`** (full):

```ts
import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const DUPE_WINDOW_MS = 15_000;

const ThreadSchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(2).max(200),
  content: z.string().min(1).max(20000),
});

export async function createThreadCore(
  tenantId: string, membershipId: string, input: z.infer<typeof ThreadSchema>,
): Promise<Result<{ threadId: string }>> {
  const parsed = ThreadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { categoryId, title, content } = parsed.data;
  const ctx = makeTenantContext(tenantId);

  const { allowed } = checkRateLimit(`forum:thread:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  // category must belong to this tenant (db(ctx) scopes the lookup).
  const category = await db(ctx).forumCategory.findFirst({ where: { id: categoryId }, select: { id: true } });
  if (!category) return { ok: false, error: "Category not found" };

  // dupe guard: identical title+content by the same author in the last 15s.
  const since = new Date(Date.now() - DUPE_WINDOW_MS);
  const recent = await db(ctx).forumThread.findFirst({
    where: { authorMembershipId: membershipId, categoryId, title, createdAt: { gte: since }, posts: { some: { content } } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (recent) return { ok: true, threadId: recent.id };

  const thread = await db(ctx).forumThread.create({
    data: {
      categoryId, authorMembershipId: membershipId, title, lastPostAt: new Date(),
      // The proxy injects tenantId on the thread; the nested post needs it set explicitly.
      posts: { create: { tenantId, authorMembershipId: membershipId, content } },
    },
    select: { id: true },
  });
  return { ok: true, threadId: thread.id };
}

const PostSchema = z.object({ threadId: z.string().min(1), content: z.string().min(1).max(20000) });

export async function createPostCore(
  tenantId: string, membershipId: string, input: z.infer<typeof PostSchema>,
): Promise<Result<{ postId: string }>> {
  const parsed = PostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { threadId, content } = parsed.data;
  const ctx = makeTenantContext(tenantId);

  const { allowed } = checkRateLimit(`forum:post:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  const thread = await db(ctx).forumThread.findFirst({ where: { id: threadId }, select: { id: true, isLocked: true } });
  if (!thread) return { ok: false, error: "Thread not found" };
  if (thread.isLocked) return { ok: false, error: "Thread is locked" };

  const since = new Date(Date.now() - DUPE_WINDOW_MS);
  const dup = await db(ctx).forumPost.findFirst({
    where: { threadId, authorMembershipId: membershipId, content, createdAt: { gte: since } },
    select: { id: true },
  });
  if (dup) return { ok: true, postId: dup.id };

  const post = await db(ctx).forumPost.create({
    data: { threadId, authorMembershipId: membershipId, content },
    select: { id: true },
  });
  await db(ctx).forumThread.update({ where: { id: threadId }, data: { lastPostAt: new Date() } });
  return { ok: true, postId: post.id };
}

export async function editPostCore(
  tenantId: string, membershipId: string, postId: string, content: string,
): Promise<Result> {
  if (content.trim().length < 1 || content.length > 20000) return { ok: false, error: "Invalid content" };
  const ctx = makeTenantContext(tenantId);
  const post = await db(ctx).forumPost.findFirst({ where: { id: postId }, select: { authorMembershipId: true } });
  if (!post) return { ok: false, error: "Post not found" };
  if (post.authorMembershipId !== membershipId) return { ok: false, error: "You can only edit your own posts" };
  await db(ctx).forumPost.update({ where: { id: postId }, data: { content: content.trim(), isEdited: true } });
  return { ok: true };
}

export async function deletePostCore(
  tenantId: string, membershipId: string, viewerTier: RankTier, postId: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  const post = await db(ctx).forumPost.findFirst({
    where: { id: postId },
    select: { authorMembershipId: true, threadId: true, createdAt: true },
  });
  if (!post) return { ok: false, error: "Post not found" };
  const first = await db(ctx).forumPost.findFirst({ where: { threadId: post.threadId }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (first?.id === postId) return { ok: false, error: "Cannot delete the original post — delete the thread instead" };
  const isOwner = post.authorMembershipId === membershipId;
  if (!isOwner && !hasTier(viewerTier, "COMMAND")) return { ok: false, error: "You can only delete your own posts" };
  await db(ctx).forumPost.delete({ where: { id: postId } });
  return { ok: true };
}

export async function setThreadPinLockCore(
  tenantId: string, viewerTier: RankTier, threadId: string, patch: { isPinned?: boolean; isLocked?: boolean },
): Promise<Result> {
  if (!hasTier(viewerTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const ctx = makeTenantContext(tenantId);
  const thread = await db(ctx).forumThread.findFirst({ where: { id: threadId }, select: { id: true } });
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
  tenantId: string, viewerTier: RankTier, input: z.infer<typeof CategorySchema>,
): Promise<Result<{ categoryId: string }>> {
  if (!hasTier(viewerTier, "COMMAND")) return { ok: false, error: "Requires COMMAND" };
  const parsed = CategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  const clash = await db(ctx).forumCategory.findFirst({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (clash) return { ok: false, error: "A category with that slug already exists" };
  const cat = await db(ctx).forumCategory.create({
    data: { name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description, sortOrder: parsed.data.sortOrder ?? 0 },
    select: { id: true },
  });
  return { ok: true, categoryId: cat.id };
}

export async function deleteCategoryCore(
  tenantId: string, viewerTier: RankTier, categoryId: string,
): Promise<Result> {
  if (!hasTier(viewerTier, "COMMAND")) return { ok: false, error: "Requires COMMAND" };
  const ctx = makeTenantContext(tenantId);
  const cat = await db(ctx).forumCategory.findFirst({ where: { id: categoryId }, select: { id: true } });
  if (!cat) return { ok: false, error: "Category not found" };
  await db(ctx).forumCategory.delete({ where: { id: categoryId } });
  return { ok: true };
}
```

NOTE on the dupe-guard `posts: { some: { content } }` filter in createThreadCore: this finds a recent thread whose first post matches. Under `db(ctx)` the where is tenant-injected on forum_thread; the nested `posts.some` relation filter is implicitly tenant-safe because the posts belong to that tenant's thread. Fine.

- [ ] **Step 4:** green (~128). lint + tsc clean.
- [ ] **Step 5: Commit** `feat(forums): write actions (create/reply/edit/delete/pin-lock/category) with dupe guard + tier gates`

---

## Task 4: Session-bound action wrappers

**Files:** `lib/actions/forums.ts`

`"use server"` wrappers: resolve session accountId → getViewerMembership(tenant, accountId) → pass membershipId + tier to the core. Tenant comes from the request (getCurrentTenant). Revalidate the forum paths.

- [ ] **Step 1: Implement `lib/actions/forums.ts`:**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import {
  createThreadCore, createPostCore, editPostCore, deletePostCore,
  setThreadPinLockCore, createCategoryCore, deleteCategoryCore,
} from "./forums-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function createThreadAction(input: { categoryId: string; title: string; content: string }) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createThreadCore(c.tenantId, c.membershipId, input);
  if (r.ok) revalidatePath("/forums");
  return r;
}
export async function createPostAction(input: { threadId: string; content: string }) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createPostCore(c.tenantId, c.membershipId, input);
  return r;
}
export async function editPostAction(postId: string, content: string) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  return editPostCore(c.tenantId, c.membershipId, postId, content);
}
export async function deletePostAction(postId: string) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  return deletePostCore(c.tenantId, c.membershipId, c.tier, postId);
}
export async function setThreadPinLockAction(threadId: string, patch: { isPinned?: boolean; isLocked?: boolean }) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  return setThreadPinLockCore(c.tenantId, c.tier, threadId, patch);
}
export async function createCategoryAction(input: { name: string; slug: string; description?: string }) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createCategoryCore(c.tenantId, c.tier, input);
  if (r.ok) revalidatePath("/forums");
  return r;
}
export async function deleteCategoryAction(categoryId: string) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteCategoryCore(c.tenantId, c.tier, categoryId);
  if (r.ok) revalidatePath("/forums");
  return r;
}
```

- [ ] **Step 2:** gates (test 128 still green — no new tests; wrappers exercised via UI + the core tests). lint + tsc + build clean. Commit `feat(forums): session-bound action wrappers`

---

## Task 5: Forum UI (replace stub)

**Files:** replace `app/forums/page.tsx`; add `[categorySlug]/page.tsx` + `new-thread-form.tsx`; `[categorySlug]/[threadId]/page.tsx` + `reply-form.tsx` + `post-actions.tsx`.

Use the FG forum UI as the reference for layout, ported to the platform's neutral styling + `<L>` labels + the new query/action shapes. Keep it functional, not fancy (Phase 4 polishes). Key pieces:
- `/forums` — list categories (getCategories), link to each; if COMMAND, link to category management.
- `/forums/[categorySlug]` — getThreadsByCategory; new-thread form (client, useTransition + dupe-safe disabled); thread rows show title/author/postCount/pinned/locked badges.
- `/forums/[categorySlug]/[threadId]` — getThread; posts list with author + edited badge; reply form (client); post-actions (edit own / delete own or COMMAND / pin-lock OFFICER+) driven by the viewer's tier (resolve via getViewerMembership in the page, pass tier to the client islands).
- All forms: useTransition, disable while pending, error display (the double-submit client guard + server dupe guard both apply — belt and suspenders).
- Each page reads `getFullTenantContext` for the forums flag (layout already gates) + viewer membership/tier.

Detailed component code follows the Phase 1 forum components pattern (new-thread-form.tsx / reply-form.tsx already existed in FG with the dupe-fix) adapted to call the new actions. The implementer should port faithfully; exact JSX is at the implementer's discretion following the established neutral-styling pattern (bg-neutral-900 inputs, etc.) used across Phases 1-2.

- [ ] **Step 1-N:** build the pages + forms. Each form client component imports the matching action from `@/lib/actions/forums`. Resolve viewer tier server-side in the thread page and pass booleans (`canModerate`, `myMembershipId`) to client islands.
- [ ] **Gate:** `pnpm build` (routes `/forums`, `/forums/[categorySlug]`, `/forums/[categorySlug]/[threadId]` dynamic), `pnpm test` 128, lint + tsc clean.
- [ ] **Live-verify:** start on a port, seed a tenant with a category + thread via SQL, confirm `/forums` lists it, thread renders, and forums-disabled tenant 404s (the layout gate from Phase 2 still applies).
- [ ] **Commit** `feat(forums): forum UI — categories, threads, posts, reply, moderation`

---

## Task 6: Leak fuzzer + seed update

**Files:** `scripts/tenant-leak-fuzzer.ts`, `scripts/seed.ts`

- [ ] **Step 1:** Add forum_thread + forum_post probes to `TENANT_SCOPED_READS` in the fuzzer (Pass 1 + Pass 2). Seed tenant B with a marker thread/post; assert tenant A reads never expose them. Run `pnpm fuzz:leak` (APP_USER_PASSWORD set) — both passes clean.
- [ ] **Step 2:** Extend `scripts/seed.ts` to give the `demo` + `freedomguards` tenants a starter "General" + "Announcements" category each (idempotent upsert) so the deployed forums aren't empty.
- [ ] **Step 3:** Commit `feat(forums): leak-fuzzer forum probes + seed starter categories`

---

## Task 7: Gate + PR + CI + review

- [ ] Full gate (test/lint/rule-test/tsc/build/fuzz). Push `feat/phase-3a-forums`, open PR. Watch CI green. STOP for controller holistic review (focus: every forum write goes through db(ctx) — no prismaGlobal on forum tables; tier gates on moderation/category; dupe guards; RLS isolation proven by forums-rls test + fuzzer; nested-post tenantId injection correct).

---

## Task 8: Deploy (controller, after merge)

- [ ] Pull + rebuild on VPS. **Run migration + db:setup-rls** (3a ADDS tables + RLS policies — must `prisma migrate deploy` AND re-run `pnpm db:setup-rls` so the new forum policies apply under app_user). Restart. Authed prod walk: create a category (COMMAND), open a thread, reply, edit, pin; confirm a second tenant can't see it; confirm forums-off tenant 404s.

---

## Self-Review

**Spec coverage:** forums content types (forum_thread/forum_post/forum_category) under the `forums` flag ✓; tenant-scoped + RLS ✓; authored by Membership ✓; moderation tiers (OFFICER pin/lock, COMMAND categories, author/COMMAND delete) ✓; dupe guard (ported from FG fix) ✓; search ✓; flag gate (Phase 2) reused ✓.

**RLS correctness:** all forum reads/writes via `db(ctx)`; nested post create sets tenantId explicitly (proxy only injects top-level); new RLS policies for 3 tables + setup-rls re-run on deploy; fuzzer extended.

**Deferrals (logged):** custom-field VALUES on threads (shared `custom_field_value` infra — own task); thread view-count increment (cosmetic, skip); rich-text/markdown rendering (Phase 4 polish); pagination on long threads (Phase 4).

**Type consistency:** `*Core(tenantId, membershipId|viewerTier, …)` uniform; `RankTier` from permissions; query row types (ThreadRow/PostRow) exported; `authorMembershipId` consistent across schema/queries/actions; `getViewerMembership` returns `{id, tier}` used by wrappers.

---

## Execution

Subagent-driven. Two-stage review on Task 3 (write actions). Controller deploy (Task 8) after merge + holistic review.
