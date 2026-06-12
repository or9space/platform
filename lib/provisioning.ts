import { createHash, randomBytes } from "node:crypto";
import { prismaGlobal } from "./db";
import { sendEmail } from "./email";

const CLAIM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashClaimToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export type ProvisionResult =
  | { ok: true; tenantId: string; claimToken: string; claimUrl: string }
  | { ok: false; error: string };

function baseDomain(): string {
  return process.env.PLATFORM_BASE_DOMAIN ?? "or9.space";
}

/**
 * Idempotent: approving an already-provisioned pending row re-issues a fresh
 * claim token on the existing tenant (covers "founder lost the email").
 */
export async function provisionApprovedTenant(pendingId: string): Promise<ProvisionResult> {
  const pending = await prismaGlobal.pendingTenant.findUnique({ where: { id: pendingId } });
  if (!pending) return { ok: false, error: "Pending request not found" };
  if (pending.status === "REJECTED") return { ok: false, error: "Request was rejected" };

  const claimToken = randomBytes(32).toString("hex");
  const tokenHash = hashClaimToken(claimToken);
  const expires = new Date(Date.now() + CLAIM_TTL_MS);

  try {
    const tenantId = await prismaGlobal.$transaction(async (tx) => {
      const existing = await tx.tenant.findUnique({ where: { slug: pending.slug } });
      if (existing) {
        const claimed =
          existing.founderClaimTokenHash === null &&
          existing.founderClaimExpiresAt === null &&
          (await tx.membership.count({ where: { tenantId: existing.id, tier: "COMMAND" } })) > 0;
        if (claimed) throw new ProvisionError("Tenant already claimed");
        const samePending = pending.status === "APPROVED";
        if (!samePending) throw new ProvisionError("Subdomain already taken by a live tenant");
        await tx.tenant.update({
          where: { id: existing.id },
          data: { founderClaimTokenHash: tokenHash, founderClaimExpiresAt: expires },
        });
        return existing.id;
      }
      const tenant = await tx.tenant.create({
        data: {
          slug: pending.slug,
          name: pending.name,
          plan: "FREE",
          status: "LIVE",
          founderClaimTokenHash: tokenHash,
          founderClaimExpiresAt: expires,
        },
      });
      await tx.tenantConfigOverride.create({ data: { tenantId: tenant.id, json: {} } });
      await tx.pendingTenant.update({
        where: { id: pending.id },
        data: { status: "APPROVED", decidedAt: new Date() },
      });
      return tenant.id;
    });

    const claimUrl = `https://${pending.slug}.${baseDomain()}/claim?token=${claimToken}`;
    await sendEmail({
      to: pending.requestedEmail,
      subject: `Your org ${pending.name} is live on or9.space`,
      text: `Welcome aboard.\n\nClaim your founder seat (expires in 7 days):\n${claimUrl}\n\nThis link creates the org's first admin account.`,
    });
    return { ok: true, tenantId, claimToken, claimUrl };
  } catch (e) {
    if (e instanceof ProvisionError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function rejectPendingTenant(
  pendingId: string,
  reason: string,
): Promise<{ ok: boolean }> {
  const pending = await prismaGlobal.pendingTenant.findUnique({ where: { id: pendingId } });
  if (!pending || pending.status !== "PENDING") return { ok: false };
  await prismaGlobal.pendingTenant.update({
    where: { id: pendingId },
    data: { status: "REJECTED", decidedAt: new Date() },
  });
  await sendEmail({
    to: pending.requestedEmail,
    subject: `or9.space: about your request for ${pending.slug}.or9.space`,
    text: `We could not approve your org request.\n\nReason: ${reason}\n\nYou are welcome to re-apply: https://or9.space/start-org`,
  });
  return { ok: true };
}

class ProvisionError extends Error {}
