import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface ApplicationRow {
  id: string;
  handle: string;
  email: string;
  contactName: string | null;
  message: string;
  status: string;
  reviewNote: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export const APPLICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export async function listApplications(ctx: TenantContext): Promise<ApplicationRow[]> {
  const rows = await db(ctx).application.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, handle: true, email: true, contactName: true, message: true,
      status: true, reviewNote: true, reviewedAt: true, createdAt: true,
      reviewedBy: { select: { displayName: true, username: true } },
    },
  });
  return rows.map((a) => ({
    id: a.id, handle: a.handle, email: a.email, contactName: a.contactName,
    message: a.message, status: a.status, reviewNote: a.reviewNote,
    reviewedByName: a.reviewedBy?.displayName ?? a.reviewedBy?.username ?? null,
    reviewedAt: a.reviewedAt, createdAt: a.createdAt,
  }));
}

export async function countPendingApplications(ctx: TenantContext): Promise<number> {
  return db(ctx).application.count({ where: { status: "PENDING" } });
}
