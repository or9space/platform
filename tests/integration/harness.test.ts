import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

describe("integration harness", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTwoTenants();
  });
  afterAll(async () => {
    await resetDb();
    await closeDb();
  });

  it("seeds two distinct live tenants", async () => {
    const tenants = await testPrisma.tenant.findMany({
      where: { slug: { startsWith: "it-" } },
      orderBy: { slug: "asc" },
    });
    expect(tenants.map((t) => t.slug)).toEqual([TENANT_A.slug, TENANT_B.slug]);
    expect(tenants.every((t) => t.status === "LIVE")).toBe(true);
  });
});
