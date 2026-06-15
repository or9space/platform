import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const EVENT_TYPES = ["OP", "MEETING", "TRAINING", "SOCIAL", "TOURNAMENT", "OTHER"] as const;
const RSVP_STATUSES = ["GOING", "MAYBE", "NOT_GOING"] as const;

const EventSchema = z
  .object({
    title: z.string().min(2).max(160),
    type: z.enum(EVENT_TYPES),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().nullable().optional(),
    location: z.string().max(200).nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
  })
  .refine((d) => !d.endsAt || d.endsAt >= d.startsAt, {
    message: "End time must be after the start time",
    path: ["endsAt"],
  });

/** Raw form shape; the schema coerces strings → Date / enums on parse. */
export interface EventInput {
  title: string;
  type: string;
  startsAt: string | Date;
  endsAt?: string | Date | null;
  location?: string | null;
  description?: string | null;
}

function requireOfficer(tier: RankTier): Result {
  return hasTier(tier, "OFFICER") ? { ok: true } : { ok: false, error: "Requires OFFICER+ in this org" };
}

export async function createEventCore(
  tenantId: string, membershipId: string, tier: RankTier, input: EventInput,
): Promise<Result<{ eventId: string }>> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = EventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { allowed } = checkRateLimit(`event:create:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;
  const created = await db(ctx).event.create({
    data: {
      tenantId,
      title: d.title,
      type: d.type,
      startsAt: d.startsAt,
      endsAt: d.endsAt ?? null,
      location: d.location ?? null,
      description: d.description ?? null,
      createdById: membershipId,
    },
    select: { id: true },
  });
  return { ok: true, eventId: created.id };
}

export async function updateEventCore(
  tenantId: string, _membershipId: string, tier: RankTier, eventId: string, input: EventInput,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const parsed = EventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;
  const res = await db(ctx).event.updateMany({
    where: { id: eventId },
    data: {
      title: d.title, type: d.type, startsAt: d.startsAt,
      endsAt: d.endsAt ?? null, location: d.location ?? null, description: d.description ?? null,
    },
  });
  if (res.count === 0) return { ok: false, error: "Event not found" };
  return { ok: true };
}

export async function deleteEventCore(
  tenantId: string, _membershipId: string, tier: RankTier, eventId: string,
): Promise<Result> {
  const g = requireOfficer(tier);
  if (!g.ok) return g;
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).event.deleteMany({ where: { id: eventId } });
  if (res.count === 0) return { ok: false, error: "Event not found" };
  return { ok: true };
}

const RsvpSchema = z.object({ eventId: z.string().min(1), status: z.enum(RSVP_STATUSES) });

export async function rsvpEventCore(
  tenantId: string, membershipId: string, input: z.infer<typeof RsvpSchema>,
): Promise<Result> {
  const parsed = RsvpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { eventId, status } = parsed.data;

  const { allowed } = checkRateLimit(`event:rsvp:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  const ctx = makeTenantContext(tenantId);
  const event = await db(ctx).event.findFirst({ where: { id: eventId }, select: { id: true } });
  if (!event) return { ok: false, error: "Event not found" };

  await db(ctx).eventRsvp.upsert({
    where: { eventId_membershipId: { eventId, membershipId } },
    create: { tenantId, eventId, membershipId, status },
    update: { status },
  });
  return { ok: true };
}
