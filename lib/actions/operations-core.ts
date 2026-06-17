import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const STATUSES = ["PLANNING", "BRIEFING", "ACTIVE", "DEBRIEFING", "COMPLETED", "ARCHIVED"] as const;

const OperationSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(STATUSES).optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  objectives: z.array(z.string().max(400)).max(20).optional(),
  aar: z.string().max(20000).nullable().optional(),
});

export interface OperationInput {
  title: string;
  description?: string | null;
  status?: string;
  scheduledAt?: string | Date | null;
  location?: string | null;
  objectives?: string[];
  aar?: string | null;
}

function requireOfficer(tier: RankTier): Result {
  return hasTier(tier, "OFFICER") ? { ok: true } : { ok: false, error: "Requires OFFICER+ in this org" };
}

export async function createOperationCore(
  tenantId: string, membershipId: string, tier: RankTier, input: OperationInput,
): Promise<Result<{ operationId: string }>> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = OperationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { allowed } = checkRateLimit(`op:create:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;
  const op = await db(ctx).operation.create({
    data: {
      tenantId,
      title: d.title,
      description: d.description ?? null,
      status: d.status ?? "PLANNING",
      scheduledAt: d.scheduledAt ?? null,
      location: d.location ?? null,
      objectives: d.objectives ?? [],
      createdById: membershipId,
    },
    select: { id: true },
  });
  return { ok: true, operationId: op.id };
}

export async function updateOperationCore(
  tenantId: string, _membershipId: string, tier: RankTier, operationId: string, input: OperationInput,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = OperationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;
  const res = await db(ctx).operation.updateMany({
    where: { id: operationId },
    data: {
      title: d.title, description: d.description ?? null,
      status: d.status ?? "PLANNING", scheduledAt: d.scheduledAt ?? null, location: d.location ?? null,
      objectives: d.objectives ?? [],
      ...(d.aar !== undefined ? { aar: d.aar ?? null } : {}),
    },
  });
  if (res.count === 0) return { ok: false, error: "Operation not found" };
  return { ok: true };
}

export async function setOperationStatusCore(
  tenantId: string, _membershipId: string, tier: RankTier, operationId: string, status: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { ok: false, error: "Invalid status" };
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).operation.updateMany({ where: { id: operationId }, data: { status: status as (typeof STATUSES)[number] } });
  if (res.count === 0) return { ok: false, error: "Operation not found" };
  return { ok: true };
}

export async function deleteOperationCore(
  tenantId: string, _membershipId: string, tier: RankTier, operationId: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).operation.deleteMany({ where: { id: operationId } });
  if (res.count === 0) return { ok: false, error: "Operation not found" };
  return { ok: true };
}

export async function saveAarCore(
  tenantId: string, _membershipId: string, tier: RankTier, operationId: string, aar: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = z.string().max(20000).safeParse(aar);
  if (!parsed.success) return { ok: false, error: "AAR too long (max 20 000 chars)" };
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).operation.updateMany({ where: { id: operationId }, data: { aar: parsed.data } });
  if (res.count === 0) return { ok: false, error: "Operation not found" };
  return { ok: true };
}

const SignupSchema = z.object({
  operationId: z.string().min(1),
  role: z.string().max(80).nullable().optional(),
});

export async function signupOperationCore(
  tenantId: string, membershipId: string, input: z.infer<typeof SignupSchema>,
): Promise<Result> {
  const parsed = SignupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { operationId, role } = parsed.data;

  const { allowed } = checkRateLimit(`op:signup:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  const ctx = makeTenantContext(tenantId);
  const op = await db(ctx).operation.findFirst({ where: { id: operationId }, select: { id: true } });
  if (!op) return { ok: false, error: "Operation not found" };

  await db(ctx).operationSignup.upsert({
    where: { operationId_membershipId: { operationId, membershipId } },
    create: { tenantId, operationId, membershipId, role: role ?? null },
    update: { role: role ?? null },
  });
  return { ok: true };
}

export async function withdrawOperationCore(
  tenantId: string, membershipId: string, operationId: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  await db(ctx).operationSignup.deleteMany({ where: { operationId, membershipId } });
  return { ok: true };
}
