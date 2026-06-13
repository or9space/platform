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
