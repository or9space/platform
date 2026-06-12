import { PrismaClient } from "@prisma/client";

/**
 * Wraps every operation of a PrismaClient in a transaction that sets the
 * transaction-local `app.tenant_id` setting. RLS policies key off it.
 * This is the official Prisma RLS recipe (client extension + set_config).
 *
 * Used by lib/db.ts when RLS_ENABLED=1 (production: app connects as the
 * non-BYPASSRLS role app_user). In dev against a superuser connection the
 * policies don't bite, but the extension is still exercised.
 */
export function withTenantRls(prisma: PrismaClient, tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
}
