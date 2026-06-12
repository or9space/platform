import { PrismaClient } from "@prisma/client";

/** Minimal shape of a Prisma interactive-transaction client we need here. */
type TxLike = {
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

/**
 * Sets the transaction-local `app.tenant_id` so RLS policies admit the
 * subsequent statements in an INTERACTIVE transaction. Bootstrap writes that
 * touch tenant-scoped tables via `prismaGlobal.$transaction(async (tx) => …)`
 * (register, claim, provisioning) bypass the `withTenantRls` extension, so they
 * must call this first. Harmless under a superuser connection (RLS bypassed
 * anyway); required under the non-BYPASSRLS `app_user` role with RLS_ENABLED=1.
 */
export async function setTenantContext(tx: TxLike, tenantId: string): Promise<void> {
  await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`;
}

type QueryTxLike = {
  $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
};

/**
 * Cross-tenant membership existence for the Q13 one-membership-per-account
 * guard. RLS hides memberships in other tenants from app_user, so this calls
 * the SECURITY DEFINER `account_membership_count` function (defined in
 * prisma/rls/policies.sql) which bypasses RLS and returns only an integer.
 * Under a superuser/dev connection the function still works (runs as owner).
 */
export async function accountMembershipCount(tx: QueryTxLike, accountId: string): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ count: number | bigint }>>`
    SELECT account_membership_count(${accountId}) AS count
  `;
  return Number(rows[0]?.count ?? 0);
}

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
