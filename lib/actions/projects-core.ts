import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

function requireOfficer(tier: RankTier): Result {
  return hasTier(tier, "OFFICER") ? { ok: true } : { ok: false, error: "Requires OFFICER+ in this org" };
}

const ProjectSchema = z.object({ name: z.string().min(2).max(120), description: z.string().max(2000).nullable().optional() });
export interface ProjectInput { name: string; description?: string | null }

export async function createProjectCore(
  tenantId: string, membershipId: string, tier: RankTier, input: ProjectInput,
): Promise<Result<{ id: string }>> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = ProjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { allowed } = checkRateLimit(`project:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };
  const ctx = makeTenantContext(tenantId);
  const p = await db(ctx).project.create({
    data: { tenantId, name: parsed.data.name, description: parsed.data.description ?? null, createdById: membershipId },
    select: { id: true },
  });
  return { ok: true, id: p.id };
}

export async function deleteProjectCore(
  tenantId: string, _membershipId: string, tier: RankTier, id: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).project.deleteMany({ where: { id } });
  if (res.count === 0) return { ok: false, error: "Not found" };
  return { ok: true };
}

const TicketSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(2).max(200),
  description: z.string().max(5000).nullable().optional(),
});

/** Any member may add a ticket to a project. */
export async function createTicketCore(
  tenantId: string, membershipId: string, input: z.infer<typeof TicketSchema>,
): Promise<Result<{ id: string }>> {
  const parsed = TicketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { projectId, title, description } = parsed.data;
  const { allowed } = checkRateLimit(`ticket:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };
  const ctx = makeTenantContext(tenantId);
  const project = await db(ctx).project.findFirst({ where: { id: projectId }, select: { id: true } });
  if (!project) return { ok: false, error: "Project not found" };
  const t = await db(ctx).ticket.create({
    data: { tenantId, projectId, title, description: description ?? null, createdById: membershipId },
    select: { id: true },
  });
  return { ok: true, id: t.id };
}

/** Any member may move a ticket. */
export async function setTicketStatusCore(
  tenantId: string, _membershipId: string, ticketId: string, status: string,
): Promise<Result> {
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { ok: false, error: "Invalid status" };
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).ticket.updateMany({ where: { id: ticketId }, data: { status: status as (typeof STATUSES)[number] } });
  if (res.count === 0) return { ok: false, error: "Not found" };
  return { ok: true };
}

/** Any member may set/clear the assignee (by username). */
export async function assignTicketCore(
  tenantId: string, _membershipId: string, ticketId: string, username: string | null,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  let assigneeId: string | null = null;
  if (username) {
    const m = await db(ctx).membership.findFirst({ where: { username }, select: { id: true } });
    if (!m) return { ok: false, error: `No member named "${username}"` };
    assigneeId = m.id;
  }
  const res = await db(ctx).ticket.updateMany({ where: { id: ticketId }, data: { assigneeId } });
  if (res.count === 0) return { ok: false, error: "Not found" };
  return { ok: true };
}

/** The ticket creator or an OFFICER may delete it. */
export async function deleteTicketCore(
  tenantId: string, membershipId: string, tier: RankTier, ticketId: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  const t = await db(ctx).ticket.findFirst({ where: { id: ticketId }, select: { createdById: true } });
  if (!t) return { ok: false, error: "Not found" };
  if (t.createdById !== membershipId && !hasTier(tier, "OFFICER")) {
    return { ok: false, error: "Only the creator or an officer can delete this" };
  }
  await db(ctx).ticket.deleteMany({ where: { id: ticketId } });
  return { ok: true };
}
