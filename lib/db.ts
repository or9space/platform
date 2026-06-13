import { PrismaClient } from "@prisma/client";
export type { TenantPlan } from "@prisma/client";
import type { TenantContext } from "./tenant";
import { withTenantRls } from "./rls";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Tables that live above tenancy (no tenant_id column). Calls against these
 * pass through unmodified. Any other model lookup auto-injects tenant_id.
 */
export const GLOBAL_TABLES = [
  "account",
  "accountOauth",
  "tenant",
  "pendingTenant",
  "tenantConfigOverride",
  "tenantFeatureFlag",
  "supportTicket",
  "supportMessage",
  "adSlot",
  "adCreative",
] as const;

type ModelName = keyof PrismaClient & string;
type Operation = "findMany" | "findFirst" | "findUnique" | "count" | "aggregate"
               | "create" | "createMany" | "update" | "updateMany"
               | "upsert" | "delete" | "deleteMany";

const READ_OPS: Operation[] = [
  "findMany", "findFirst", "findUnique", "count", "aggregate",
  "update", "updateMany", "delete", "deleteMany", "upsert"
];
const WRITE_DATA_OPS: Operation[] = ["create", "createMany", "upsert"];

function withTenant(obj: unknown, tenantId: string): Record<string, unknown> {
  return { ...((obj as Record<string, unknown>) ?? {}), tenantId };
}

function injectTenantId(
  op: Operation,
  args: Record<string, unknown> | undefined,
  tenantId: string,
): Record<string, unknown> {
  const a = { ...(args ?? {}) };

  // upsert is special: it carries BOTH a `where` (scope the match) AND
  // `create`/`update` payloads. Inject into all three so the created row
  // never lands without a tenant_id (which would violate NOT NULL / RLS).
  if (op === "upsert") {
    return {
      ...a,
      where: withTenant(a.where, tenantId),
      create: withTenant(a.create, tenantId),
      update: a.update ?? {},
    };
  }

  if (READ_OPS.includes(op)) {
    return { ...a, where: withTenant(a.where, tenantId) };
  }
  if (WRITE_DATA_OPS.includes(op)) {
    const data = a.data as Record<string, unknown> | undefined;
    if (Array.isArray(data)) {
      return { ...a, data: data.map((d) => ({ ...d, tenantId })) };
    }
    return { ...a, data: withTenant(data, tenantId) };
  }
  return a;
}

/**
 * Tenant-scoped Prisma accessor. Auto-injects `tenant_id` into the TOP-LEVEL
 * where/data/create payloads of each operation.
 *
 * SECURITY — nested writes are NOT covered: a nested relation create such as
 * `forumThread.create({ data: { posts: { create: {...} } } })` only gets
 * tenant_id injected on the top-level row. Callers MUST set `tenantId`
 * explicitly inside every nested `create` payload, or the row lands without a
 * tenant and (when RLS_ENABLED=1) is rejected by the Postgres WITH CHECK.
 */
export function db(ctx: TenantContext) {
  const target = process.env.RLS_ENABLED === "1" ? withTenantRls(prisma, ctx.tenantId) : prisma;
  return new Proxy(target as any, {
    get(target, modelKey: ModelName) {
      const model = target[modelKey];
      if (!model || typeof model !== "object") return model;
      const isGlobal = (GLOBAL_TABLES as readonly string[]).includes(modelKey);
      if (isGlobal) return model;
      return new Proxy(model, {
        get(modelTarget, opKey: Operation) {
          const opFn = (modelTarget as any)[opKey];
          if (typeof opFn !== "function") return opFn;
          return (args: Record<string, unknown> | undefined) =>
            opFn(injectTenantId(opKey, args, ctx.tenantId));
        },
      });
    },
  }) as PrismaClient;
}

/**
 * Direct prisma access for global-only queries from infrastructure code.
 * Application code MUST use db(ctx) — enforced by the no-untenanted-query
 * ESLint rule.
 */
export const prismaGlobal = prisma;
