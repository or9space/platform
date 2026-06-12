"use server";

import { z } from "zod";
import { prismaGlobal } from "../db";
import { hashPassword } from "../password";
import { checkRateLimit, SIGNUP_LIMIT } from "../rate-limit";

const RegisterSchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
  username: z.string().regex(/^[a-zA-Z0-9_.-]{2,32}$/),
});

export type RegisterResult = { ok: true; accountId: string } | { ok: false; error: string };

export async function registerAccountWithMembership(
  input: z.infer<typeof RegisterSchema>,
): Promise<RegisterResult> {
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { tenantId, email, password, username } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const { allowed } = checkRateLimit(
    `register:${normalizedEmail}`,
    SIGNUP_LIMIT.maxRequests,
    SIGNUP_LIMIT.windowMs,
  );
  if (!allowed) return { ok: false, error: "Too many attempts — try again later" };

  const tenant = await prismaGlobal.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status !== "LIVE") return { ok: false, error: "Org not found" };

  try {
    const accountId = await prismaGlobal.$transaction(async (tx) => {
      const existing = await tx.account.findUnique({
        where: { email: normalizedEmail },
        include: { memberships: { select: { id: true } } },
      });
      if (existing) {
        // Q13 v1: one membership per account, app-layer guard.
        if (existing.memberships.length > 0) {
          throw new GuardError("This email is already a member of an org on or9.space");
        }
        if (!existing.passwordHash) {
          throw new GuardError("Account exists without a password — contact support");
        }
      }
      const usernameTaken = await tx.membership.findUnique({
        where: { tenantId_username: { tenantId, username } },
      });
      if (usernameTaken) throw new GuardError("That username is taken in this org");

      const account =
        existing ??
        (await tx.account.create({
          data: { email: normalizedEmail, passwordHash: await hashPassword(password) },
        }));
      await tx.membership.create({
        data: { accountId: account.id, tenantId, username, tier: "ENLISTED" },
      });
      return account.id;
    });
    return { ok: true, accountId };
  } catch (e) {
    if (e instanceof GuardError) return { ok: false, error: e.message };
    throw e;
  }
}

class GuardError extends Error {}
