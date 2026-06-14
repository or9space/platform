"use server";

import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { prismaGlobal, db } from "../db";
import { hashPassword } from "../password";
import { getSessionAccountId } from "../auth";
import { requireTier } from "../authz";
import { ForbiddenError } from "../permissions";
import { makeTenantContext } from "../tenant";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export type LoginLinkResult = { ok: true; path: string } | { ok: false; error: string };

/**
 * OFFICER+ generates a one-time set-password link for a member of their org.
 * Returns a site-relative path (the caller prepends its origin) containing the
 * raw token — shown once, only the hash is stored.
 */
export async function createLoginLink(tenantId: string, membershipId: string): Promise<LoginLinkResult> {
  const accountId = await getSessionAccountId();
  try {
    await requireTier(tenantId, accountId, "OFFICER");
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: e.message };
    throw e;
  }

  // Resolve the target membership through RLS so it must belong to this tenant.
  const ctx = makeTenantContext(tenantId);
  const member = await db(ctx).membership.findFirst({
    where: { id: membershipId },
    select: { accountId: true },
  });
  if (!member) return { ok: false, error: "Member not found in this org" };

  const raw = randomBytes(32).toString("base64url");
  await prismaGlobal.loginSetupToken.create({
    data: {
      tokenHash: hashToken(raw),
      accountId: member.accountId,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return { ok: true, path: `/set-password?token=${raw}` };
}

export type PeekResult = { ok: true; email: string } | { ok: false; error: string };

/** Read-only: validate a token and reveal which account it sets, for the form. */
export async function peekSetupToken(raw: string): Promise<PeekResult> {
  if (!raw) return { ok: false, error: "Missing token" };
  const row = await prismaGlobal.loginSetupToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    select: { usedAt: true, expiresAt: true, account: { select: { email: true } } },
  });
  if (!row) return { ok: false, error: "This link is invalid." };
  if (row.usedAt) return { ok: false, error: "This link has already been used." };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, error: "This link has expired — ask an officer for a new one." };
  return { ok: true, email: row.account.email };
}

const SetPwSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10, "Password must be at least 10 characters").max(200),
});

export type SetPwResult = { ok: true } | { ok: false; error: string };

/** Public: consume a token and set the account's password. Single use. */
export async function setPasswordWithToken(input: z.infer<typeof SetPwSchema>): Promise<SetPwResult> {
  const parsed = SetPwSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { token, password } = parsed.data;

  const { allowed } = checkRateLimit(`setpw:${hashToken(token).slice(0, 16)}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many attempts — try again later" };

  const tokenHash = hashToken(token);
  try {
    await prismaGlobal.$transaction(async (tx) => {
      const row = await tx.loginSetupToken.findUnique({
        where: { tokenHash },
        select: { id: true, accountId: true, usedAt: true, expiresAt: true },
      });
      if (!row) throw new GuardError("This link is invalid.");
      if (row.usedAt) throw new GuardError("This link has already been used.");
      if (row.expiresAt.getTime() < Date.now()) throw new GuardError("This link has expired — ask an officer for a new one.");

      await tx.account.update({ where: { id: row.accountId }, data: { passwordHash: await hashPassword(password) } });
      // Mark used; guard against a concurrent double-spend via the usedAt filter.
      const used = await tx.loginSetupToken.updateMany({
        where: { id: row.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (used.count !== 1) throw new GuardError("This link has already been used.");
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof GuardError) return { ok: false, error: e.message };
    throw e;
  }
}

class GuardError extends Error {}
