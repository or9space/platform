import { z } from "zod";
import { db, prismaGlobal } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { setTenantContext } from "../rls";
import { writeAudit } from "../audit";

// Fix 5: constrain T so `ok: true` results can carry typed payloads without
// polluting the error branch with accidental properties.
type Result<T extends Record<string, unknown> = Record<string, unknown>> =
  ({ ok: true; error?: never } & T) | { ok: false; error: string };

const ProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(500).optional(),
  // http(s)-only guard blocks javascript:/data: XSS; downstream consumers must still validate content-type (SSRF) if they ever fetch it.
  avatarUrl: z.string().trim().url().max(500).refine((u) => u.startsWith("http://") || u.startsWith("https://"), "Must be an http(s) URL").optional(),
}).strict();

// Fix 3 (HIGH — profile audit) + Fix 4 (MED — bind membershipId to actorAccountId):
// Takes actorAccountId and binds the lookup to it so a forged membershipId
// cannot edit someone else's profile. Writes an audit row on every change.
export async function updateOwnProfileCore(
  tenantId: string, actorAccountId: string, membershipId: string, input: z.infer<typeof ProfileSchema>,
): Promise<Result> {
  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  // SECURITY: bind to the acting account — a member can only edit their OWN
  // membership even if membershipId were ever forged by a caller.
  const me = await db(ctx).membership.findFirst({
    where: { id: membershipId, accountId: actorAccountId }, select: { id: true },
  });
  if (!me) return { ok: false, error: "Member not found" };
  await db(ctx).membership.update({ where: { id: membershipId }, data: parsed.data });
  await writeAudit(ctx, actorAccountId, "member.profile.update", { membershipId, changed: Object.keys(parsed.data) });
  return { ok: true };
}

const TIER_VALUES = ["ENLISTED", "NCO", "OFFICER", "COMMAND"] as const;
const TierSchema = z.enum(TIER_VALUES);

class LockoutError extends Error {}

// Fix 1 (CRITICAL — TOCTOU lockout race) + Fix 2 (HIGH — derive actor tier from DB):
// DROPS the actorTier param — the core re-derives the actor's tier from the DB
// (defense-in-depth: never trust a passed tier for a privilege change). The
// last-COMMAND demotion guard is now ATOMIC via a Serializable transaction so
// two concurrent demotes cannot both pass the count check and drop the org to
// zero COMMAND (permanent lockout).
export async function setMemberTierCore(
  tenantId: string, actorAccountId: string, targetMembershipId: string, newTier: RankTier,
): Promise<Result> {
  const parsedTier = TierSchema.safeParse(newTier);
  if (!parsedTier.success) return { ok: false, error: "Invalid rank" };
  const ctx = makeTenantContext(tenantId);

  // SECURITY: derive the actor's tier from the DB — never trust a caller-passed
  // tier for a privilege change. db(ctx) scopes this to the tenant.
  const actor = await db(ctx).membership.findFirst({
    where: { accountId: actorAccountId }, select: { tier: true },
  });
  if (!actor || !hasTier(actor.tier as RankTier, "COMMAND")) {
    return { ok: false, error: "Requires COMMAND" };
  }

  const target = await db(ctx).membership.findFirst({
    where: { id: targetMembershipId }, select: { id: true, tier: true, username: true },
  });
  if (!target) return { ok: false, error: "Member not found" };
  if (target.tier === newTier) return { ok: true };

  if (target.tier === "COMMAND" && newTier !== "COMMAND") {
    // ATOMIC lockout guard: count COMMAND and demote in one Serializable tx so
    // two concurrent demotes of distinct COMMAND members cannot both pass the
    // count check and leave the org with zero COMMAND (permanent lockout).
    // NOTE: tx.membership.* inside prismaGlobal.$transaction is the sanctioned
    // interactive-transaction pattern (mirrors claim.ts). The lint rule flags
    // prismaGlobal.<model>.<verb> only — tx.* is not prismaGlobal.*, so it is safe.
    try {
      await prismaGlobal.$transaction(async (tx) => {
        await setTenantContext(tx, tenantId);
        const commandCount = await tx.membership.count({ where: { tenantId, tier: "COMMAND" } });
        if (commandCount <= 1) throw new LockoutError();
        await tx.membership.update({ where: { id: targetMembershipId }, data: { tier: newTier } });
      }, { isolationLevel: "Serializable" });
    } catch (e) {
      if (e instanceof LockoutError) return { ok: false, error: "Cannot demote the last COMMAND member" };
      // Serialization failure under concurrency — caller can retry.
      return { ok: false, error: "Could not complete — please try again" };
    }
  } else {
    await db(ctx).membership.update({ where: { id: targetMembershipId }, data: { tier: newTier } });
  }

  await writeAudit(ctx, actorAccountId, "member.tier.change", {
    targetMembershipId, username: target.username, from: target.tier, to: newTier,
  });
  return { ok: true };
}
