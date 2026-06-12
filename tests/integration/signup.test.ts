import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createPendingTenant } from "@/lib/actions/signup";
import { testPrisma, resetDb, closeDb, seedTwoTenants, TENANT_A } from "./setup";
import { _resetRateLimitStore } from "@/lib/rate-limit";

describe("createPendingTenant", () => {
  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("creates a pending row for a valid request", async () => {
    const r = await createPendingTenant({
      slug: "it-newcrew", name: "New Crew", email: "boss@it-test.example",
      description: "We mine rocks.", turnstileToken: null,
    });
    expect(r.ok).toBe(true);
    const row = await testPrisma.pendingTenant.findFirst({ where: { slug: "it-newcrew" } });
    expect(row?.status).toBe("PENDING");
  });

  it("rejects a slug already taken by a live tenant", async () => {
    const r = await createPendingTenant({
      slug: TENANT_A.slug, name: "X", email: "x@it-test.example",
      description: "d", turnstileToken: null,
    });
    if (!r.ok) expect(r.error).toMatch(/taken/i);
    expect(r.ok).toBe(false);
  });

  it("rejects reserved slugs", async () => {
    for (const slug of ["admin", "support", "www", "api"]) {
      const r = await createPendingTenant({
        slug, name: "X", email: "x@it-test.example", description: "d", turnstileToken: null,
      });
      expect(r.ok).toBe(false);
    }
  });

  it("rejects malformed slugs", async () => {
    const r = await createPendingTenant({
      slug: "Bad_Slug!", name: "X", email: "x@it-test.example", description: "d", turnstileToken: null,
    });
    expect(r.ok).toBe(false);
  });
});
