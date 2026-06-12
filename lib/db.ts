import { PrismaClient } from "@prisma/client";
import type { TenantContext } from "./tenant";

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

function injectTenantId(
  op: Operation,
  args: Record<string, unknown> | undefined,
  tenantId: string,
): Record<string, unknown> {
  const a = args ?? {};
  if (READ_OPS.includes(op)) {
    return { ...a, where: { ...(a.where as object ?? {}), tenantId } };
  }
  if (WRITE_DATA_OPS.includes(op)) {
    const data = a.data as Record<string, unknown> | undefined;
    if (Array.isArray(data)) {
      return { ...a, data: data.map((d) => ({ ...d, tenantId })) };
    }
    return { ...a, data: { ...(data ?? {}), tenantId } };
  }
  return a;
}

export function db(ctx: TenantContext) {
  return new Proxy(prisma as any, {
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
