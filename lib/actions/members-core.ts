import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { writeAudit } from "../audit";

type Result<T = object> = ({ ok: true; error?: never } & T) | { ok: false; error: string };

const ProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().trim().url().max(500).refine((u) => u.startsWith("http://") || u.startsWith("https://"), "Must be an http(s) URL").optional(),
}).strict();

export async function updateOwnProfileCore(
  tenantId: string, membershipId: string, input: z.infer<typeof ProfileSchema>,
): Promise<Result> {
  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  const me = await db(ctx).membership.findFirst({ where: { id: membershipId }, select: { id: true } });
  if (!me) return { ok: false, error: "Member not found" };
  await db(ctx).membership.update({ where: { id: membershipId }, data: parsed.data });
  return { ok: true };
}

const TIER_VALUES = ["ENLISTED", "NCO", "OFFICER", "COMMAND"] as const;
const TierSchema = z.enum(TIER_VALUES);

export async function setMemberTierCore(
  tenantId: string, actorAccountId: string, actorTier: RankTier, targetMembershipId: string, newTier: RankTier,
): Promise<Result> {
  if (!hasTier(actorTier, "COMMAND")) return { ok: false, error: "Requires COMMAND" };
  const parsedTier = TierSchema.safeParse(newTier);
  if (!parsedTier.success) return { ok: false, error: "Invalid rank" };
  const ctx = makeTenantContext(tenantId);

  const target = await db(ctx).membership.findFirst({
    where: { id: targetMembershipId }, select: { id: true, tier: true, username: true },
  });
  if (!target) return { ok: false, error: "Member not found" };
  if (target.tier === newTier) return { ok: true };

  // Lockout protection: never let the org drop to zero COMMAND members.
  if (target.tier === "COMMAND" && newTier !== "COMMAND") {
    const commandCount = await db(ctx).membership.count({ where: { tier: "COMMAND" } });
    if (commandCount <= 1) return { ok: false, error: "Cannot demote the last COMMAND member" };
  }

  await db(ctx).membership.update({ where: { id: targetMembershipId }, data: { tier: newTier } });
  await writeAudit(ctx, actorAccountId, "member.tier.change", {
    targetMembershipId, username: target.username, from: target.tier, to: newTier,
  });
  return { ok: true };
}
