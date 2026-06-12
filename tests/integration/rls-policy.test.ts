import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

/**
 * Proves the RLS policies actually isolate rows for a non-BYPASSRLS role.
 * Creates a throwaway role, applies setup scripts, connects as that role,
 * and asserts cross-tenant reads return nothing.
 */
const RLS_TEST_PASSWORD = "rls-test-password-1";

function adminUrl(): string {
  return process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
}

function appUserUrl(): string {
  const u = new URL(adminUrl());
  u.username = "app_user";
  u.password = RLS_TEST_PASSWORD;
  return u.toString();
}

describe("RLS tenant isolation (app_user role)", () => {
  let appClient: PrismaClient;

  beforeAll(async () => {
    execSync("pnpm db:setup-rls", {
      env: { ...process.env, APP_USER_PASSWORD: RLS_TEST_PASSWORD },
      stdio: "pipe",
    });
    // Ensure the password matches even if the role pre-existed.
    await testPrisma.$executeRawUnsafe(
      `ALTER ROLE app_user LOGIN PASSWORD '${RLS_TEST_PASSWORD}'`,
    );
    await resetDb();
    await seedTwoTenants();
    const acc = await testPrisma.account.create({
      data: { email: "rls@it-test.example", displayName: "RLS Probe" },
    });
    await testPrisma.membership.createMany({
      data: [
        { accountId: acc.id, tenantId: TENANT_A.id, username: "alpha-user" },
        { accountId: acc.id, tenantId: TENANT_B.id, username: "bravo-user" },
      ],
    });
    appClient = new PrismaClient({ datasources: { db: { url: appUserUrl() } } });
  }, 60000);

  afterAll(async () => {
    await appClient?.$disconnect();
    await resetDb();
    await closeDb();
  });

  it("sees only tenant A rows when app.tenant_id = A", async () => {
    const [, rows] = await appClient.$transaction([
      appClient.$executeRaw`SELECT set_config('app.tenant_id', ${TENANT_A.id}, TRUE)`,
      appClient.membership.findMany({}),
    ]);
    expect(rows.length).toBe(1);
    expect(rows[0].tenantId).toBe(TENANT_A.id);
  });

  it("sees nothing when app.tenant_id is unset", async () => {
    const rows = await appClient.membership.findMany({});
    expect(rows.length).toBe(0);
  });

  it("cannot insert a row for another tenant (WITH CHECK)", async () => {
    const acc = await testPrisma.account.create({
      data: { email: "rls2@it-test.example" },
    });
    await expect(
      appClient.$transaction([
        appClient.$executeRaw`SELECT set_config('app.tenant_id', ${TENANT_A.id}, TRUE)`,
        appClient.membership.create({
          data: { accountId: acc.id, tenantId: TENANT_B.id, username: "smuggled" },
        }),
      ]),
    ).rejects.toThrow();
  });
});
