import { z } from "zod";
import { db } from "../db";
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
