import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  ticketCount: number;
  doneCount: number;
}

export interface TicketRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeUsername: string | null;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  tickets: TicketRow[];
}

export const TICKET_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

export async function listProjects(ctx: TenantContext): Promise<ProjectRow[]> {
  const rows = await db(ctx).project.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, description: true,
      tickets: { select: { status: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id, name: p.name, description: p.description,
    ticketCount: p.tickets.length,
    doneCount: p.tickets.filter((t) => t.status === "DONE").length,
  }));
}

export async function getProject(ctx: TenantContext, id: string): Promise<ProjectDetail | null> {
  const p = await db(ctx).project.findFirst({
    where: { id },
    select: {
      id: true, name: true, description: true,
      tickets: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, title: true, description: true, status: true, assigneeId: true,
          assignee: { select: { displayName: true, username: true } },
        },
      },
    },
  });
  if (!p) return null;
  return {
    id: p.id, name: p.name, description: p.description,
    tickets: p.tickets.map((t) => ({
      id: t.id, title: t.title, description: t.description, status: t.status, assigneeId: t.assigneeId,
      assigneeName: t.assignee?.displayName ?? t.assignee?.username ?? null,
      assigneeUsername: t.assignee?.username ?? null,
    })),
  };
}
