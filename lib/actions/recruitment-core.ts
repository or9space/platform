import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { db, prismaGlobal } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { setTenantContext, accountMembershipCount } from "../rls";
import { checkRateLimit, SIGNUP_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

const ApplySchema = z.object({
  handle: z.string().regex(/^[a-zA-Z0-9_.-]{2,32}$/, "Handle must be 2–32 letters, numbers, _ . -"),
  email: z.string().email().max(200),
  contactName: z.string().max(120).nullable().optional(),
  message: z.string().min(10, "Tell us a bit about yourself (10+ chars)").max(4000),
});
export type ApplyInput = z.infer<typeof ApplySchema>;

/**
 * ANONYMOUS submit. Resolves under the tenant's RLS context (db(ctx) wraps the
 * insert in a tx that sets app.tenant_id, satisfying the WITH CHECK policy).
 * Rate-limited per email to deter spam. No account/session required.
 */
export async function submitApplicationCore(tenantId: string, input: ApplyInput): Promise<Result<{ id: string }>> {
  const parsed = ApplySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const email = parsed.data.email.trim().toLowerCase();

  const { allowed } = checkRateLimit(`apply:${tenantId}:${email}`, SIGNUP_LIMIT.maxRequests, SIGNUP_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many applications — try again later" };

  const ctx = makeTenantContext(tenantId);
  // One open application per email per org.
  const existing = await db(ctx).application.findFirst({
    where: { email, status: "PENDING" }, select: { id: true },
  });
  if (existing) return { ok: false, error: "You already have an application pending review for this org" };

  const a = await db(ctx).application.create({
    data: {
      tenantId, handle: parsed.data.handle, email,
      contactName: parsed.data.contactName ?? null, message: parsed.data.message,
    },
    select: { id: true },
  });
  return { ok: true, id: a.id };
}

/** OFFICER+ rejects an application with an optional note. */
export async function rejectApplicationCore(
  tenantId: string, membershipId: string, tier: RankTier, applicationId: string, note: string | null,
): Promise<Result> {
  if (!hasTier(tier, "OFFICER")) return { ok: false, error: "Requires OFFICER+ in this org" };
  const cleanNote = (note ?? "").trim().slice(0, 500) || null;
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).application.updateMany({
    where: { id: applicationId, status: "PENDING" },
    data: { status: "REJECTED", reviewedById: membershipId, reviewedAt: new Date(), reviewNote: cleanNote },
  });
  if (res.count === 0) return { ok: false, error: "Application not found or already reviewed" };
  return { ok: true };
}

/**
 * OFFICER+ approves an application: creates (or reuses) the applicant's Account,
 * creates an ENLISTED Membership, and returns a one-time set-password link to
 * share. Enforces the one-membership-per-account rule. Atomic.
 */
export async function approveApplicationCore(
  tenantId: string, membershipId: string, tier: RankTier, applicationId: string,
): Promise<Result<{ setPasswordPath: string; username: string }>> {
  if (!hasTier(tier, "OFFICER")) return { ok: false, error: "Requires OFFICER+ in this org" };

  // Read the application under RLS so it must belong to this tenant.
  const ctx = makeTenantContext(tenantId);
  const app = await db(ctx).application.findFirst({
    where: { id: applicationId },
    select: { id: true, email: true, handle: true, status: true },
  });
  if (!app) return { ok: false, error: "Application not found" };
  if (app.status !== "PENDING") return { ok: false, error: "Already reviewed" };

  const raw = randomBytes(32).toString("base64url");
  try {
    const username = await prismaGlobal.$transaction(async (tx) => {
      await setTenantContext(tx, tenantId);

      // Lock in the review decision; bail if another officer beat us to it.
      const claimed = await tx.application.updateMany({
        where: { id: app.id, status: "PENDING" },
        data: { status: "APPROVED", reviewedById: membershipId, reviewedAt: new Date() },
      });
      if (claimed.count !== 1) throw new GuardError("Already reviewed");

      const usernameTaken = await tx.membership.findUnique({
        where: { tenantId_username: { tenantId, username: app.handle } },
      });
      if (usernameTaken) throw new GuardError(`Username "${app.handle}" is already taken in this org — reject and ask for another`);

      const existingAccount = await tx.account.findUnique({ where: { email: app.email } });
      if (existingAccount && (await accountMembershipCount(tx, existingAccount.id)) > 0) {
        throw new GuardError("That email already belongs to a member of an org on or9.space");
      }
      const account = existingAccount ?? (await tx.account.create({ data: { email: app.email } }));
      await tx.membership.create({
        data: { accountId: account.id, tenantId, username: app.handle, tier: "ENLISTED" },
      });
      await tx.loginSetupToken.create({
        data: { tokenHash: hashToken(raw), accountId: account.id, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
      });
      return app.handle;
    });
    return { ok: true, setPasswordPath: `/set-password?token=${raw}`, username };
  } catch (e) {
    if (e instanceof GuardError) return { ok: false, error: e.message };
    throw e;
  }
}

class GuardError extends Error {}
