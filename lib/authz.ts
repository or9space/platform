import { db } from "./db";
import { makeTenantContext } from "./tenant";
import { hasTier, ForbiddenError, type RankTier } from "./permissions";

export interface ViewerMembership {
  id: string;
  username: string;
  displayName: string | null;
  tier: RankTier;
}

/**
 * The signed-in global account's membership within a specific tenant, or null.
 * Reads through db(ctx) so the RLS-protected `membership` table is queried
 * with app.tenant_id set (works under both dev superuser and prod app_user).
 *
 * NOTE: db(ctx) proxy auto-injects tenantId into the WHERE clause — do NOT
 * add tenantId manually here, or it will be duplicated/overridden.
 */
export async function getViewerMembership(
  tenantId: string,
  accountId: string | null,
): Promise<ViewerMembership | null> {
  if (!accountId) return null;
  const ctx = makeTenantContext(tenantId);
  const m = await db(ctx).membership.findFirst({
    where: { accountId },
    select: { id: true, username: true, displayName: true, tier: true },
  });
  return m as ViewerMembership | null;
}

export async function requireTier(
  tenantId: string,
  accountId: string | null,
  required: RankTier,
): Promise<ViewerMembership> {
  const m = await getViewerMembership(tenantId, accountId);
  if (!m || !hasTier(m.tier, required)) {
    throw new ForbiddenError(`Requires ${required} in this org`);
  }
  return m;
}
