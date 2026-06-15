import { PrismaClient } from "@prisma/client";

/**
 * Integration test helpers. These run against the real Postgres named by
 * DATABASE_URL (.env locally → or9-pg container; CI → service container).
 * Each suite truncates the tables it touches between tests via resetDb().
 */
export const testPrisma = new PrismaClient();

export const TENANT_A = { id: "it-alpha", slug: "it-alpha", name: "Alpha Test Org" };
export const TENANT_B = { id: "it-bravo", slug: "it-bravo", name: "Bravo Test Org" };

export async function seedTwoTenants(): Promise<void> {
  for (const t of [TENANT_A, TENANT_B]) {
    await testPrisma.tenant.upsert({
      where: { slug: t.slug },
      update: { name: t.name, status: "LIVE", plan: "FREE" },
      create: { id: t.id, slug: t.slug, name: t.name, status: "LIVE", plan: "FREE" },
    });
  }
}

/** Order matters: children before parents. Only touches integration data. */
export async function resetDb(): Promise<void> {
  await testPrisma.message.deleteMany({});
  await testPrisma.conversationParticipant.deleteMany({});
  await testPrisma.conversation.deleteMany({});
  await testPrisma.application.deleteMany({});
  await testPrisma.supportMessage.deleteMany({});
  await testPrisma.supportTicket.deleteMany({});
  await testPrisma.auditLog.deleteMany({});
  await testPrisma.membership.deleteMany({});
  await testPrisma.account.deleteMany({ where: { email: { contains: "@it-test." } } });
  await testPrisma.pendingTenant.deleteMany({});
  await testPrisma.tenantConfigOverride.deleteMany({ where: { tenantId: { in: [TENANT_A.id, TENANT_B.id] } } });
  await testPrisma.tenant.deleteMany({ where: { slug: { startsWith: "it-" } } });
}

export async function closeDb(): Promise<void> {
  await testPrisma.$disconnect();
}
