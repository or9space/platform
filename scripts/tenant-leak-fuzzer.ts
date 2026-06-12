import { PrismaClient } from "@prisma/client";
import { db } from "../lib/db";
import { makeTenantContext } from "../lib/tenant";

/**
 * Tenant-leak fuzzer. Seeds two tenants with marker data, then reads every
 * tenant-scoped model through db(ctx) for tenant A and asserts no tenant-B
 * marker appears anywhere in the serialized result. Exits 1 on any leak.
 *
 * Run: pnpm fuzz:leak  (uses DATABASE_URL)
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
}

async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { tenantId: { in: [A.id, B.id] } } });
  await prisma.membership.deleteMany({ where: { tenantId: { in: [A.id, B.id] } } });
  await prisma.account.deleteMany({ where: { email: { contains: "@fz-test." } } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: "fz-" } } });
}

async function main() {
  await cleanup();
  await seed();
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
  await cleanup();
  await prisma.$disconnect();
  if (leaks > 0) {
    console.error(`${leaks} leak(s) found`);
    process.exit(1);
  }
  console.log("tenant-leak fuzzer: no leaks");
}

main();
