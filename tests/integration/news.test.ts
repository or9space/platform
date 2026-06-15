import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createNewsCore, updateNewsCore, deleteNewsCore } from "@/lib/actions/news-core";
import { listNews, getNews, latestNews } from "@/lib/queries/news";
import { makeTenantContext } from "@/lib/tenant";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = () => makeTenantContext(TENANT_A.id);

describe("news", () => {
  let officer: string;
  let enlisted: string;
  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    await seedTwoTenants();
    const a = await testPrisma.account.create({ data: { email: "no@it-test.example" } });
    officer = (await testPrisma.membership.create({ data: { accountId: a.id, tenantId: TENANT_A.id, username: "no", tier: "OFFICER" } })).id;
    const b = await testPrisma.account.create({ data: { email: "ne@it-test.example" } });
    enlisted = (await testPrisma.membership.create({ data: { accountId: b.id, tenantId: TENANT_A.id, username: "ne", tier: "ENLISTED" } })).id;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("officer publishes; enlisted cannot", async () => {
    const ok = await createNewsCore(TENANT_A.id, officer, "OFFICER", { title: "Patch 4.0", body: "Notes", category: "PATCH_NOTES" });
    expect(ok.ok).toBe(true);
    const bad = await createNewsCore(TENANT_A.id, enlisted, "ENLISTED", { title: "x", body: "y", category: "COMMUNITY" });
    expect(bad.ok).toBe(false);
  });

  it("pinned posts sort first", async () => {
    await createNewsCore(TENANT_A.id, officer, "OFFICER", { title: "Older", body: "b", category: "COMMUNITY" });
    await createNewsCore(TENANT_A.id, officer, "OFFICER", { title: "Pinned", body: "b", category: "ANNOUNCEMENT", isPinned: true });
    const list = await listNews(ctxA(), 10);
    expect(list[0]?.title).toBe("Pinned");
    expect((await latestNews(ctxA(), 1))[0]?.title).toBe("Pinned");
  });

  it("officer edits and deletes", async () => {
    const r = await createNewsCore(TENANT_A.id, officer, "OFFICER", { title: "Draft", body: "b", category: "GUIDE" });
    if (!r.ok) throw new Error("create failed");
    expect((await updateNewsCore(TENANT_A.id, officer, "OFFICER", r.postId, { title: "Final", body: "b2", category: "GUIDE" })).ok).toBe(true);
    expect((await getNews(ctxA(), r.postId))?.title).toBe("Final");
    expect((await deleteNewsCore(TENANT_A.id, officer, "OFFICER", r.postId)).ok).toBe(true);
    expect(await getNews(ctxA(), r.postId)).toBeNull();
  });

  it("does not leak across tenants", async () => {
    const r = await createNewsCore(TENANT_A.id, officer, "OFFICER", { title: "Secret", body: "b", category: "ANNOUNCEMENT" });
    if (!r.ok) throw new Error("create failed");
    expect(await getNews(makeTenantContext(TENANT_B.id), r.postId)).toBeNull();
    expect(await listNews(makeTenantContext(TENANT_B.id), 10)).toHaveLength(0);
  });
});
