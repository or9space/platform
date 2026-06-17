import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}

/** Most recent notifications for a member, newest first. */
export async function listNotifications(
  ctx: TenantContext,
  membershipId: string,
  limit = 30,
): Promise<NotificationRow[]> {
  return db(ctx).notification.findMany({
    where: { membershipId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      href: true,
      readAt: true,
      createdAt: true,
    },
  });
}

/** Count of notifications that have not yet been read. */
export async function countUnreadNotifications(
  ctx: TenantContext,
  membershipId: string,
): Promise<number> {
  return db(ctx).notification.count({
    where: { membershipId, readAt: null },
  });
}
