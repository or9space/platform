import { PrismaClient } from "@prisma/client";
import { db } from "../lib/db";
import { makeTenantContext } from "../lib/tenant";

/**
 * Tenant-leak fuzzer — two-pass validation:
 *
 * PASS 1 — Application-injection layer (db(ctx) where-injection proxy):
 *   Runs as the DB owner with RLS_ENABLED unset. Postgres RLS is NOT active
 *   here — the test proves that the in-process tenant injection can never expose
 *   a cross-tenant row regardless of RLS.
 *
 * PASS 2 — Postgres RLS policy layer (app_user role):
 *   Constructs a dedicated PrismaClient connected as the non-BYPASSRLS
 *   app_user role and drives it with explicit $transaction([set_config, query])
 *   calls — the same pattern withTenantRls uses internally. Asserts:
 *     (a) A raw read with NO app.tenant_id set returns 0 rows (RLS enforced).
 *     (b) A read with app.tenant_id = A returns only tenant-A rows and never
 *         the tenant-B marker (RLS isolates tenants correctly).
 *   If the app_user role does not exist or the password is wrong, Pass 2
 *   prints a SKIP notice (it is a setup pre-condition, not a code defect).
 *
 * Run: pnpm fuzz:leak
 */

const prisma = new PrismaClient();

const A = { id: "fz-alpha", slug: "fz-alpha", name: "Fuzz Alpha" };
const B = { id: "fz-bravo", slug: "fz-bravo", name: "Fuzz Bravo" };
const MARKER_B = "FZMARKER_BRAVO_SECRET";

// Phase 1: membership + auditLog are the tenant-scoped tables.
// Phase 3 ports MUST add each new model here.
const TENANT_SCOPED_READS: Array<{ model: string; read: (ctx: any) => Promise<unknown> }> = [
  { model: "membership", read: (ctx) => db(ctx).membership.findMany({}) },
  { model: "auditLog", read: (ctx) => db(ctx).auditLog.findMany({}) },
  { model: "forumCategory", read: (ctx) => db(ctx).forumCategory.findMany({}) },
  { model: "forumThread", read: (ctx) => db(ctx).forumThread.findMany({}) },
  { model: "forumPost", read: (ctx) => db(ctx).forumPost.findMany({}) },
];

async function seed() {
  for (const t of [A, B]) {
    await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: {},
      create: { id: t.id, slug: t.slug, name: t.name, status: "LIVE", plan: "FREE" },
    });
  }
  const acc = await prisma.account.upsert({
    where: { email: "fuzz@fz-test.example" },
    update: {},
    create: { email: "fuzz@fz-test.example" },
  });
  await prisma.membership.upsert({
    where: { tenantId_username: { tenantId: B.id, username: MARKER_B } },
    update: {},
    create: { accountId: acc.id, tenantId: B.id, username: MARKER_B },
  });
  await prisma.auditLog.create({
    data: { tenantId: B.id, actorAccountId: acc.id, action: MARKER_B, detail: {} },
  });

  // Seed forum rows in tenant B so the forum probes have a real marker to detect.
  const membershipB = await prisma.membership.findUniqueOrThrow({
    where: { tenantId_username: { tenantId: B.id, username: MARKER_B } },
  });

  const categoryB = await prisma.forumCategory.create({
    data: {
      tenantId: B.id,
      name: MARKER_B,
      slug: "fz-marker-bravo",
      sortOrder: 0,
    },
  });

  const threadB = await prisma.forumThread.create({
    data: {
      tenantId: B.id,
      categoryId: categoryB.id,
      authorMembershipId: membershipB.id,
      title: MARKER_B,
    },
  });

  await prisma.forumPost.create({
    data: {
      tenantId: B.id,
      threadId: threadB.id,
      authorMembershipId: membershipB.id,
      content: MARKER_B,
    },
  });
}

async function cleanup() {
  await prisma.forumPost.deleteMany({ where: { tenantId: { in: [A.id, B.id] } } });
  await prisma.forumThread.deleteMany({ where: { tenantId: { in: [A.id, B.id] } } });
  await prisma.forumCategory.deleteMany({ where: { tenantId: { in: [A.id, B.id] } } });
  await prisma.auditLog.deleteMany({ where: { tenantId: { in: [A.id, B.id] } } });
  await prisma.membership.deleteMany({ where: { tenantId: { in: [A.id, B.id] } } });
  await prisma.account.deleteMany({ where: { email: { contains: "@fz-test." } } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: "fz-" } } });
}

/** Build an app_user connection URL by swapping user + password in DATABASE_URL. */
function buildAppUserUrl(): string {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL is not set");
  const u = new URL(base);
  u.username = "app_user";
  u.password = process.env.APP_USER_PASSWORD ?? "rls-test-password-1";
  return u.toString();
}

async function runPass1(): Promise<number> {
  console.log("\n--- Pass 1: app-injection layer (owner connection, RLS off) ---");
  const ctxA = makeTenantContext(A.id);
  let leaks = 0;
  for (const probe of TENANT_SCOPED_READS) {
    const result = await probe.read(ctxA);
    const json = JSON.stringify(result);
    if (json.includes(MARKER_B) || json.includes(B.id)) {
      console.error(`LEAK: reading ${probe.model} as tenant A exposed tenant B data`);
      leaks++;
    } else {
      console.log(`ok: ${probe.model} isolated`);
    }
  }
  return leaks;
}

async function runPass2(): Promise<number> {
  console.log("\n--- Pass 2: RLS policy layer (app_user role, non-BYPASSRLS) ---");

  let appClient: PrismaClient | null = null;
  try {
    const url = buildAppUserUrl();
    appClient = new PrismaClient({ datasources: { db: { url } } });
    // Verify connectivity before running assertions.
    await appClient.$connect();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`SKIP (Pass 2): could not connect as app_user — ${msg}`);
    console.log("  (Run pnpm db:setup-rls to create the role, then re-fuzz.)");
    if (appClient) await appClient.$disconnect().catch(() => {});
    return 0;
  }

  let leaks = 0;

  try {
    // ------------------------------------------------------------------ (a)
    // Raw read with NO app.tenant_id set must return 0 rows — RLS default-deny.
    // ------------------------------------------------------------------ (a)
    const noCtxRows = await appClient.membership.findMany({});
    if (noCtxRows.length > 0) {
      console.error(
        `LEAK (RLS): no-context read as app_user returned ${noCtxRows.length} row(s) — RLS not enforced`,
      );
      leaks++;
    } else {
      console.log("ok (RLS): no-context read sees 0 rows");
    }

    // ------------------------------------------------------------------ (b)
    // Read with app.tenant_id = A must see only tenant A and never MARKER_B.
    // Use explicit $transaction([set_config, query]) — same as withTenantRls.
    // ------------------------------------------------------------------ (b)
    const [, membershipRowsA] = await appClient.$transaction([
      appClient.$executeRaw`SELECT set_config('app.tenant_id', ${A.id}, TRUE)`,
      appClient.membership.findMany({}),
    ]);

    const jsonA = JSON.stringify(membershipRowsA);
    if (jsonA.includes(MARKER_B) || jsonA.includes(B.id)) {
      console.error(
        `LEAK (RLS): tenant A membership read exposed tenant B data under app_user`,
      );
      leaks++;
    } else {
      console.log("ok (RLS): tenant A isolated (membership)");
    }

    // Also probe auditLog the same way.
    const [, auditRowsA] = await appClient.$transaction([
      appClient.$executeRaw`SELECT set_config('app.tenant_id', ${A.id}, TRUE)`,
      appClient.auditLog.findMany({}),
    ]);

    const jsonAudit = JSON.stringify(auditRowsA);
    if (jsonAudit.includes(MARKER_B) || jsonAudit.includes(B.id)) {
      console.error(
        `LEAK (RLS): tenant A auditLog read exposed tenant B data under app_user`,
      );
      leaks++;
    } else {
      console.log("ok (RLS): tenant A isolated (auditLog)");
    }

    // Probe forumCategory via RLS.
    const [, categoryRowsA] = await appClient.$transaction([
      appClient.$executeRaw`SELECT set_config('app.tenant_id', ${A.id}, TRUE)`,
      appClient.forumCategory.findMany({}),
    ]);

    const jsonCategory = JSON.stringify(categoryRowsA);
    if (jsonCategory.includes(MARKER_B) || jsonCategory.includes(B.id)) {
      console.error(
        `LEAK (RLS): tenant A forumCategory read exposed tenant B data under app_user`,
      );
      leaks++;
    } else {
      console.log("ok (RLS): tenant A isolated (forumCategory)");
    }

    // Probe forumThread via RLS.
    const [, threadRowsA] = await appClient.$transaction([
      appClient.$executeRaw`SELECT set_config('app.tenant_id', ${A.id}, TRUE)`,
      appClient.forumThread.findMany({}),
    ]);

    const jsonThread = JSON.stringify(threadRowsA);
    if (jsonThread.includes(MARKER_B) || jsonThread.includes(B.id)) {
      console.error(
        `LEAK (RLS): tenant A forumThread read exposed tenant B data under app_user`,
      );
      leaks++;
    } else {
      console.log("ok (RLS): tenant A isolated (forumThread)");
    }

    // Probe forumPost via RLS.
    const [, postRowsA] = await appClient.$transaction([
      appClient.$executeRaw`SELECT set_config('app.tenant_id', ${A.id}, TRUE)`,
      appClient.forumPost.findMany({}),
    ]);

    const jsonPost = JSON.stringify(postRowsA);
    if (jsonPost.includes(MARKER_B) || jsonPost.includes(B.id)) {
      console.error(
        `LEAK (RLS): tenant A forumPost read exposed tenant B data under app_user`,
      );
      leaks++;
    } else {
      console.log("ok (RLS): tenant A isolated (forumPost)");
    }
  } finally {
    await appClient.$disconnect();
  }

  return leaks;
}

async function main() {
  await cleanup();
  await seed();

  const pass1Leaks = await runPass1();
  const pass2Leaks = await runPass2();

  await cleanup();
  await prisma.$disconnect();

  const totalLeaks = pass1Leaks + pass2Leaks;
  if (totalLeaks > 0) {
    console.error(`\n${totalLeaks} leak(s) found`);
    process.exit(1);
  }
  console.log("\ntenant-leak fuzzer: no leaks");
}

main();
