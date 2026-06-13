import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listHandbooks, getHandbookBySlug, getViewerAck } from "@/lib/queries/handbook";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";
import {
  createHandbookCore, upsertSectionCore, deleteSectionCore, setHandbookStatusCore, acknowledgeHandbookCore,
} from "@/lib/actions/handbook-core";

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

describe("handbook write actions", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.handbookAcknowledgement.deleteMany({});
    await testPrisma.handbookSection.deleteMany({});
    await testPrisma.handbook.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("COMMAND creates a handbook; OFFICER cannot", async () => {
    const denied = await createHandbookCore(TENANT_A.id, "OFFICER", { slug: "alpha", title: "Alpha" });
    expect(denied.ok).toBe(false);
    const ok = await createHandbookCore(TENANT_A.id, "COMMAND", { slug: "alpha", title: "Alpha" });
    expect(ok.ok).toBe(true);
  });

  it("createHandbook rejects a duplicate slug", async () => {
    await createHandbookCore(TENANT_A.id, "COMMAND", { slug: "alpha", title: "Alpha" });
    const dup = await createHandbookCore(TENANT_A.id, "COMMAND", { slug: "alpha", title: "Again" });
    expect(dup.ok).toBe(false);
  });

  it("OFFICER upserts a section and bumps the handbook version", async () => {
    const h = await mkHandbook(TENANT_A.id, "alpha", "PUBLISHED", 1);
    const r = await upsertSectionCore(TENANT_A.id, "OFFICER", { handbookId: h.id, title: "Intro", body: "hello", orderIndex: 1 });
    expect(r.ok).toBe(true);
    const hb = await testPrisma.handbook.findUnique({ where: { id: h.id } });
    expect(hb?.version).toBe(2);  // bumped from 1
    const secs = await testPrisma.handbookSection.findMany({ where: { handbookId: h.id } });
    expect(secs).toHaveLength(1);
  });

  it("ENLISTED cannot upsert a section", async () => {
    const h = await mkHandbook(TENANT_A.id, "alpha");
    const r = await upsertSectionCore(TENANT_A.id, "ENLISTED", { handbookId: h.id, title: "x", body: "y", orderIndex: 1 });
    expect(r.ok).toBe(false);
  });

  it("deleteSection bumps version", async () => {
    const h = await mkHandbook(TENANT_A.id, "alpha", "PUBLISHED", 5);
    const up = await upsertSectionCore(TENANT_A.id, "OFFICER", { handbookId: h.id, title: "x", body: "y", orderIndex: 1 });
    if (!up.ok) throw new Error();
    const del = await deleteSectionCore(TENANT_A.id, "OFFICER", up.sectionId);
    expect(del.ok).toBe(true);
    const hb = await testPrisma.handbook.findUnique({ where: { id: h.id } });
    expect(hb?.version).toBe(7);  // 5 -> 6 (upsert) -> 7 (delete)
  });

  it("setStatus requires COMMAND", async () => {
    const h = await mkHandbook(TENANT_A.id, "alpha", "DRAFT");
    const denied = await setHandbookStatusCore(TENANT_A.id, "OFFICER", h.id, "PUBLISHED");
    expect(denied.ok).toBe(false);
    const ok = await setHandbookStatusCore(TENANT_A.id, "COMMAND", h.id, "PUBLISHED");
    expect(ok.ok).toBe(true);
    const hb = await testPrisma.handbook.findUnique({ where: { id: h.id } });
    expect(hb?.status).toBe("PUBLISHED");
  });

  it("acknowledge records current version; re-ack after bump updates versionRead", async () => {
    const h = await mkHandbook(TENANT_A.id, "alpha", "PUBLISHED", 1);
    const m = await mkMembership(TENANT_A.id, "reader");
    const a1 = await acknowledgeHandbookCore(TENANT_A.id, m.id, h.id);
    expect(a1.ok).toBe(true);
    let ack = await testPrisma.handbookAcknowledgement.findFirst({ where: { handbookId: h.id, membershipId: m.id } });
    expect(ack?.versionRead).toBe(1);
    // bump version via an edit, then re-ack
    await upsertSectionCore(TENANT_A.id, "OFFICER", { handbookId: h.id, title: "New", body: "z", orderIndex: 1 });  // version -> 2
    const a2 = await acknowledgeHandbookCore(TENANT_A.id, m.id, h.id);
    expect(a2.ok).toBe(true);
    ack = await testPrisma.handbookAcknowledgement.findFirst({ where: { handbookId: h.id, membershipId: m.id } });
    expect(ack?.versionRead).toBe(2);
  });

  it("cannot acknowledge a DRAFT handbook", async () => {
    const h = await mkHandbook(TENANT_A.id, "draft1", "DRAFT");
    const m = await mkMembership(TENANT_A.id, "reader");
    const r = await acknowledgeHandbookCore(TENANT_A.id, m.id, h.id);
    expect(r.ok).toBe(false);
  });

  it("cannot edit a handbook in another tenant", async () => {
    const hb = await mkHandbook(TENANT_B.id, "bravo");
    const r = await upsertSectionCore(TENANT_A.id, "OFFICER", { handbookId: hb.id, title: "x", body: "y", orderIndex: 1 });
    expect(r.ok).toBe(false);  // db(ctx) -> handbook invisible
  });
});
