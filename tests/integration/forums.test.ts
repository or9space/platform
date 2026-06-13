import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { getCategories, getThreadsByCategory, getThread, searchThreads } from "@/lib/queries/forums";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";
import {
  createThreadCore, createPostCore, editPostCore, deletePostCore, setThreadPinLockCore,
  createCategoryCore,
} from "@/lib/actions/forums-core";
import { _resetRateLimitStore } from "@/lib/rate-limit";

const ctxA = makeTenantContext(TENANT_A.id);

async function seedForum() {
  const acc = await testPrisma.account.create({ data: { email: "f@it-test.example" } });
  const mA = await testPrisma.membership.create({ data: { accountId: acc.id, tenantId: TENANT_A.id, username: "fa", displayName: "Forum A" } });
  const catA = await testPrisma.forumCategory.create({ data: { tenantId: TENANT_A.id, name: "General", slug: "general", sortOrder: 0 } });
  const thread = await testPrisma.forumThread.create({
    data: { tenantId: TENANT_A.id, categoryId: catA.id, authorMembershipId: mA.id, title: "Hello world thread", lastPostAt: new Date() },
  });
  await testPrisma.forumPost.create({ data: { tenantId: TENANT_A.id, threadId: thread.id, authorMembershipId: mA.id, content: "first post body" } });
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
  afterAll(async () => { await resetDb(); });

  it("getCategories returns only this tenant's categories", async () => {
    await seedForum();
    const cats = await getCategories(ctxA);
    expect(cats.map((c) => c.name)).toEqual(["General"]);
  });

  it("getThreadsByCategory returns threads + author + post count, tenant-scoped", async () => {
    await seedForum();
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

describe("forum write actions", () => {
  let mA: string;
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
    const r = await createThreadCore(TENANT_A.id, mA, { categoryId: catB.id, title: "xx", content: "y" });
    expect(r.ok).toBe(false);
  });

  it("createPost appends; dupe guard collapses identical", async () => {
    const th = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "TT", content: "op" });
    if (!th.ok) throw new Error();
    const p1 = await createPostCore(TENANT_A.id, mA, { threadId: th.threadId, content: "reply" });
    const p2 = await createPostCore(TENANT_A.id, mA, { threadId: th.threadId, content: "reply" });
    expect(p1.ok && p2.ok).toBe(true);
    const posts = await testPrisma.forumPost.count({ where: { threadId: th.threadId } });
    expect(posts).toBe(2);
  });

  it("createPost rejected on a locked thread", async () => {
    const th = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "LL", content: "op" });
    if (!th.ok) throw new Error();
    await testPrisma.forumThread.update({ where: { id: th.threadId }, data: { isLocked: true } });
    const r = await createPostCore(TENANT_A.id, mA, { threadId: th.threadId, content: "no" });
    expect(r.ok).toBe(false);
  });

  it("editPost only by author", async () => {
    const th = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "EE", content: "op" });
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
    const th = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "DD", content: "op" });
    if (!th.ok) throw new Error();
    await createPostCore(TENANT_A.id, mA, { threadId: th.threadId, content: "reply" });
    const replyRow = await testPrisma.forumPost.findFirst({ where: { threadId: th.threadId, content: "reply" } });
    const okDel = await deletePostCore(TENANT_A.id, mA, "ENLISTED", replyRow!.id);
    expect(okDel.ok).toBe(true);
    const op = await testPrisma.forumPost.findFirst({ where: { threadId: th.threadId }, orderBy: { createdAt: "asc" } });
    const badDel = await deletePostCore(TENANT_A.id, mA, "ENLISTED", op!.id);
    expect(badDel.ok).toBe(false);
  });

  it("pin/lock requires OFFICER+", async () => {
    const th = await createThreadCore(TENANT_A.id, mA, { categoryId: catId, title: "PP", content: "op" });
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
