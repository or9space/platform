"use server";

import { z } from "zod";
import { prismaGlobal } from "../db";
import { hashClaimToken } from "../provisioning";
import { hashPassword } from "../password";
import { setTenantContext, accountMembershipCount } from "../rls";

const ClaimSchema = z.object({
  tenantSlug: z.string().min(1),
  token: z.string().length(64),
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
  username: z.string().regex(/^[a-zA-Z0-9_.-]{2,32}$/),
});

export type ClaimResult = { ok: true } | { ok: false; error: string };

export async function claimFounderSeat(input: z.infer<typeof ClaimSchema>): Promise<ClaimResult> {
  const parsed = ClaimSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { tenantSlug, token, email, password, username } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const tokenHash = hashClaimToken(token);

  try {
    await prismaGlobal.$transaction(async (tx) => {
      // Surface a precise message before the atomic burn (best-effort UX).
      const peek = await tx.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!peek?.founderClaimTokenHash) throw new ClaimError("This org has already been claimed");
      if (peek.founderClaimTokenHash !== tokenHash) throw new ClaimError("Invalid claim link");
      if (peek.founderClaimExpiresAt && peek.founderClaimExpiresAt < new Date()) {
        throw new ClaimError("Claim link expired — contact support for a fresh one");
      }

      // ATOMIC check-and-burn: only the request that flips the hash to null wins.
      // Two concurrent valid submissions both pass the peek above, but exactly
      // one updateMany matches the (still-set) hash → count 1; the loser gets 0.
      const burn = await tx.tenant.updateMany({
        where: {
          slug: tenantSlug,
          founderClaimTokenHash: tokenHash,
          OR: [{ founderClaimExpiresAt: null }, { founderClaimExpiresAt: { gt: new Date() } }],
        },
        data: { founderClaimTokenHash: null, founderClaimExpiresAt: null },
      });
      if (burn.count !== 1) throw new ClaimError("This org has already been claimed");

      // RLS context for the membership write below (peek.id is this tenant).
      await setTenantContext(tx, peek.id);

      const existing = await tx.account.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing && (await accountMembershipCount(tx, existing.id)) > 0) {
        throw new ClaimError("This email is already a member of an org — contact support");
      }
      const account =
        existing ??
        (await tx.account.create({
          data: { email: normalizedEmail, passwordHash: await hashPassword(password) },
        }));
      await tx.membership.create({
        data: { accountId: account.id, tenantId: peek.id, username, tier: "COMMAND" },
      });
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ClaimError) return { ok: false, error: e.message };
    throw e;
  }
}

class ClaimError extends Error {}
