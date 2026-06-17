"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import { makeTenantContext } from "../tenant";
import { db } from "../db";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantCtx: makeTenantContext(tenant.id), membershipId: m.id };
}

/** Mark a single notification as read (no-op if already read or not owned by viewer). */
export async function markNotificationReadAction(id: string) {
  const c = await ctx();
  if (!c) return;
  await db(c.tenantCtx).notification.updateMany({
    where: { id, membershipId: c.membershipId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

/** Mark all unread notifications for the viewer as read. */
export async function markAllNotificationsReadAction() {
  const c = await ctx();
  if (!c) return;
  await db(c.tenantCtx).notification.updateMany({
    where: { membershipId: c.membershipId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}
