import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listHandbooks, getHandbookBySlug, getViewerAck } from "@/lib/queries/handbook";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = makeTenantContext(TENANT_A.id);

async function mkMembership(tenantId: string, username: string) {
  const acc = await testPrisma.account.create({ data: { email: `${username}-${Math.random().toString(36).slice(2,6)}@it.example` } });
  return testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username, tier: "ENLISTED" } });
}
async function mkHandbook(tenantId: string, slug: string, status = "PUBLISHED", version = 1) {
  return testPrisma.handbook.create({ data: { tenantId, slug, title: slug.toUpperCase(), status: status as never, version } });
}

describe("handbook queries", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.handbookAcknowledgement.deleteMany({});
    await testPrisma.handbookSection.deleteMany({});
    await testPrisma.handbook.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("listHandbooks returns this tenant's handbooks; publishedOnly filters", async () => {
    await mkHandbook(TENANT_A.id, "alpha", "PUBLISHED");
    await mkHandbook(TENANT_A.id, "draft1", "DRAFT");
    await mkHandbook(TENANT_B.id, "bravo", "PUBLISHED");
    const all = await listHandbooks(ctxA);
    expect(all.map((h) => h.slug).sort()).toEqual(["alpha", "draft1"]);
    const pub = await listHandbooks(ctxA, { publishedOnly: true });
    expect(pub.map((h) => h.slug)).toEqual(["alpha"]);
  });

  it("getHandbookBySlug returns handbook + ordered sections", async () => {
    const h = await mkHandbook(TENANT_A.id, "alpha");
    await testPrisma.handbookSection.create({ data: { tenantId: TENANT_A.id, handbookId: h.id, title: "Two", body: "b2", orderIndex: 2 } });
    await testPrisma.handbookSection.create({ data: { tenantId: TENANT_A.id, handbookId: h.id, title: "One", body: "b1", orderIndex: 1 } });
    const got = await getHandbookBySlug(ctxA, "alpha");
    expect(got?.title).toBe("ALPHA");
    expect(got?.sections.map((s) => s.title)).toEqual(["One", "Two"]);
  });

  it("getHandbookBySlug returns null for another tenant's handbook", async () => {
    await mkHandbook(TENANT_B.id, "bravo");
    expect(await getHandbookBySlug(ctxA, "bravo")).toBeNull();
  });

  it("getViewerAck returns null when no ack, then the ack with isStale flag", async () => {
    const h = await mkHandbook(TENANT_A.id, "alpha", "PUBLISHED", 2);
    const m = await mkMembership(TENANT_A.id, "reader");
    expect(await getViewerAck(ctxA, h.id, m.id)).toBeNull();
    await testPrisma.handbookAcknowledgement.create({ data: { tenantId: TENANT_A.id, handbookId: h.id, membershipId: m.id, versionRead: 1 } });
    const ack = await getViewerAck(ctxA, h.id, m.id);
    expect(ack?.versionRead).toBe(1);
    expect(ack?.isStale).toBe(true);  // versionRead 1 < handbook version 2
  });

  it("getViewerAck isStale false when versionRead matches current version", async () => {
    const h = await mkHandbook(TENANT_A.id, "alpha", "PUBLISHED", 3);
    const m = await mkMembership(TENANT_A.id, "reader");
    await testPrisma.handbookAcknowledgement.create({ data: { tenantId: TENANT_A.id, handbookId: h.id, membershipId: m.id, versionRead: 3 } });
    const ack = await getViewerAck(ctxA, h.id, m.id);
    expect(ack?.isStale).toBe(false);
  });
});
