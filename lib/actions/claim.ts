"use server";

import { z } from "zod";
import { prismaGlobal } from "../db";
import { hashClaimToken } from "../provisioning";
import { hashPassword } from "../password";

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

  try {
    await prismaGlobal.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant?.founderClaimTokenHash) throw new ClaimError("This org has already been claimed");
      if (tenant.founderClaimTokenHash !== hashClaimToken(token)) throw new ClaimError("Invalid claim link");
      if (tenant.founderClaimExpiresAt && tenant.founderClaimExpiresAt < new Date()) {
        throw new ClaimError("Claim link expired — contact support for a fresh one");
      }

      const existing = await tx.account.findUnique({
        where: { email: normalizedEmail },
        include: { memberships: { select: { id: true } } },
      });
      if (existing && existing.memberships.length > 0) {
        throw new ClaimError("This email is already a member of an org — contact support");
      }
      const account =
        existing ??
        (await tx.account.create({
          data: { email: normalizedEmail, passwordHash: await hashPassword(password) },
        }));
      await tx.membership.create({
        data: { accountId: account.id, tenantId: tenant.id, username, tier: "COMMAND" },
      });
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { founderClaimTokenHash: null, founderClaimExpiresAt: null },
      });
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ClaimError) return { ok: false, error: e.message };
    throw e;
  }
}

class ClaimError extends Error {}
