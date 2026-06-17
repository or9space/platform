import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface OperationRow {
  id: string;
  title: string;
  status: string;
  scheduledAt: Date | null;
  location: string | null;
  signupCount: number;
}

export interface SignupEntry {
  membershipId: string;
  name: string;
  username: string;
  role: string | null;
}

export interface OperationDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduledAt: Date | null;
  location: string | null;
  createdByName: string;
  objectives: string[];
  aar: string | null;
  signups: SignupEntry[];
}

export const OPERATION_STATUSES = ["PLANNING", "BRIEFING", "ACTIVE", "DEBRIEFING", "COMPLETED", "ARCHIVED"] as const;

export async function listOperations(ctx: TenantContext): Promise<OperationRow[]> {
  const rows = await db(ctx).operation.findMany({
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, status: true, scheduledAt: true, location: true,
      _count: { select: { signups: true } },
    },
  });
  return rows.map((o) => ({
    id: o.id, title: o.title, status: o.status, scheduledAt: o.scheduledAt, location: o.location,
    signupCount: o._count.signups,
  }));
}

export async function getOperation(ctx: TenantContext, id: string): Promise<OperationDetail | null> {
  const o = await db(ctx).operation.findFirst({
    where: { id },
    select: {
      id: true, title: true, description: true, status: true, scheduledAt: true, location: true,
      objectives: true, aar: true,
      createdBy: { select: { displayName: true, username: true } },
      signups: {
        orderBy: { createdAt: "asc" },
        select: { membershipId: true, role: true, membership: { select: { displayName: true, username: true } } },
      },
    },
  });
  if (!o) return null;
  return {
    id: o.id, title: o.title, description: o.description, status: o.status,
    scheduledAt: o.scheduledAt, location: o.location,
    objectives: Array.isArray(o.objectives) ? (o.objectives as string[]) : [],
    aar: typeof o.aar === "string" ? o.aar : null,
    createdByName: o.createdBy?.displayName ?? o.createdBy?.username ?? "Unknown",
    signups: o.signups.map((s) => ({
      membershipId: s.membershipId,
      name: s.membership?.displayName ?? s.membership?.username ?? "Unknown",
      username: s.membership?.username ?? "",
      role: s.role,
    })),
  };
}

export async function getMySignup(
  ctx: TenantContext, operationId: string, membershipId: string,
): Promise<{ role: string | null } | null> {
  const s = await db(ctx).operationSignup.findFirst({
    where: { operationId, membershipId },
    select: { role: true },
  });
  return s ?? null;
}
