import { describe, it, expect, vi } from "vitest";

// lib/db.ts constructs `new PrismaClient()` eagerly at module load, so the
// vi.mock factory runs during the hoisted import phase — before normal
// top-level `const` declarations execute. vi.hoisted() lifts the mock fns
// alongside vi.mock so they exist when the factory references them.
const { findManyMock, createMock, upsertMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(async () => [{ id: "x" }]),
  createMock: vi.fn(async (args: { data: Record<string, unknown> }) => args.data),
  upsertMock: vi.fn(async (args: Record<string, unknown>) => args),
}));

// PrismaClient is invoked with `new`. The mock uses a regular function that
// assigns model accessors to `this`, making it constructable under Vitest 4.
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(function (this: Record<string, unknown>) {
    this.membership = { findMany: findManyMock, create: createMock, upsert: upsertMock };
    this.account = { findMany: findManyMock, create: createMock };
  }),
}));

import { db, GLOBAL_TABLES } from "@/lib/db";

describe("db tenant indirection", () => {
  it("auto-injects tenant_id in findMany WHERE for tenant-scoped tables", async () => {
    const tenantCtx = { tenantId: "alpha" };
    await db(tenantCtx).membership.findMany({ where: { username: "joe" } });
    expect(findManyMock).toHaveBeenCalledWith({
      where: { username: "joe", tenantId: "alpha" },
    });
  });

  it("auto-injects tenant_id in create data for tenant-scoped tables", async () => {
    const tenantCtx = { tenantId: "alpha" };
    // tenantId is deliberately omitted from `data` — the proxy injects it.
    // Cast to satisfy Prisma's generated input type (which requires tenantId);
    // proving the omit-then-inject behavior is the whole point of this test.
    await db(tenantCtx).membership.create({
      data: { accountId: "a1", username: "joe", displayName: "Joe" },
    } as never);
    expect(createMock).toHaveBeenCalledWith({
      data: { accountId: "a1", username: "joe", displayName: "Joe", tenantId: "alpha" },
    });
  });

  it("injects tenant_id into upsert where AND create (so created rows are scoped)", async () => {
    const tenantCtx = { tenantId: "alpha" };
    await db(tenantCtx).membership.upsert({
      where: { tenantId_username: { tenantId: "alpha", username: "joe" } },
      create: { accountId: "a1", username: "joe" },
      update: { displayName: "Joe" },
    } as never);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { tenantId_username: { tenantId: "alpha", username: "joe" }, tenantId: "alpha" },
      create: { accountId: "a1", username: "joe", tenantId: "alpha" },
      update: { displayName: "Joe" },
    });
  });

  it("does NOT inject tenant_id for global tables", async () => {
    findManyMock.mockClear();
    const tenantCtx = { tenantId: "alpha" };
    await db(tenantCtx).account.findMany({ where: { email: "x@y" } });
    expect(findManyMock).toHaveBeenCalledWith({ where: { email: "x@y" } });
  });

  it("exposes the GLOBAL_TABLES whitelist", () => {
    expect(GLOBAL_TABLES).toContain("account");
    expect(GLOBAL_TABLES).toContain("tenant");
    expect(GLOBAL_TABLES).not.toContain("membership");
  });
});
