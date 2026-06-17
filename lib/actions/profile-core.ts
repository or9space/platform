import { z } from "zod";
import { Prisma, db } from "../db";
import { makeTenantContext } from "../tenant";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result = { ok: true } | { ok: false; error: string };

const ProfileSchema = z.object({
  displayName: z.string().max(120).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
});

export interface ProfileInput {
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

/** A member edits their OWN profile (membershipId comes from the session). */
export async function updateProfileCore(
  tenantId: string, membershipId: string, input: ProfileInput,
): Promise<Result> {
  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { allowed } = checkRateLimit(`profile:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;
  await db(ctx).membership.updateMany({
    where: { id: membershipId },
    data: {
      displayName: d.displayName?.trim() || null,
      bio: d.bio?.trim() || null,
      avatarUrl: d.avatarUrl ?? null,
    },
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Extended fields: RSI handle, timezone, socials
// ---------------------------------------------------------------------------

const SocialsSchema = z.object({
  discord: z.string().max(100).nullable().optional(),
  twitch: z.string().max(100).nullable().optional(),
  youtube: z.string().max(200).nullable().optional(),
  website: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
});

const ExtendedProfileSchema = z.object({
  rsiHandle: z.string().max(60).nullable().optional(),
  timezone: z.string().max(60).nullable().optional(),
  socials: SocialsSchema.nullable().optional(),
});

export interface ExtendedProfileInput {
  rsiHandle?: string | null;
  timezone?: string | null;
  socials?: {
    discord?: string | null;
    twitch?: string | null;
    youtube?: string | null;
    website?: string | null;
  } | null;
}

/** Update RSI handle, timezone, and/or social links for OWN membership. */
export async function updateExtendedProfileCore(
  tenantId: string,
  membershipId: string,
  input: ExtendedProfileInput,
): Promise<Result> {
  const parsed = ExtendedProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { allowed } = checkRateLimit(`profile-ext:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  const ctx = makeTenantContext(tenantId);
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  if (d.rsiHandle !== undefined) data.rsiHandle = d.rsiHandle?.trim() || null;
  if (d.timezone !== undefined) data.timezone = d.timezone?.trim() || null;
  if (d.socials !== undefined) {
    if (d.socials === null) {
      data.socials = Prisma.DbNull;
    } else {
      // Build a clean object excluding undefined/null-ish empty strings
      const s = d.socials;
      data.socials = {
        discord: s.discord?.trim() || null,
        twitch: s.twitch?.trim() || null,
        youtube: s.youtube?.trim() || null,
        website: s.website ?? null,
      };
    }
  }

  if (Object.keys(data).length === 0) return { ok: true };

  await db(ctx).membership.updateMany({
    where: { id: membershipId },
    data,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

// Weekly grid format: { mon: number[], tue: number[], ... } of hour-block indices (0–23)
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type DayKey = (typeof DAYS)[number];

const HourBlocksSchema = z.array(z.number().int().min(0).max(23)).max(24);
const AvailabilitySchema = z
  .record(z.string(), HourBlocksSchema)
  .nullable()
  .optional()
  .transform((val) => {
    if (!val) return null;
    // Only keep known day keys
    const out: Record<string, number[]> = {};
    for (const day of DAYS) {
      if (Array.isArray(val[day])) {
        out[day] = [...new Set(val[day])].sort((a, b) => a - b);
      }
    }
    return out;
  });

export type AvailabilityGrid = Partial<Record<DayKey, number[]>>;

export interface UpdateAvailabilityInput {
  availability: AvailabilityGrid | null;
}

/** Overwrite the weekly availability grid for OWN membership. */
export async function updateAvailabilityCore(
  tenantId: string,
  membershipId: string,
  input: UpdateAvailabilityInput,
): Promise<Result> {
  const parsed = AvailabilitySchema.safeParse(input.availability);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid availability" };

  const { allowed } = checkRateLimit(`availability:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — slow down" };

  const ctx = makeTenantContext(tenantId);
  await db(ctx).membership.updateMany({
    where: { id: membershipId },
    data: { availability: parsed.data !== null ? parsed.data : Prisma.DbNull },
  });
  return { ok: true };
}
