import { db } from "./db";
import type { TenantContext } from "./tenant";

/** Append an audit row for this tenant. audit_logs is tenant-scoped (RLS). */
export async function writeAudit(
  ctx: TenantContext,
  actorAccountId: string,
  action: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  await db(ctx).auditLog.create({
    data: { tenantId: ctx.tenantId, actorAccountId, action, detail: detail as never },
  });
}
