import { prismaGlobal } from "./db";
import { sendEmail } from "./email";

const REJECT_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export interface CleanupResult {
  rejected: number;
  reminders: number;
}

/**
 * Stale-pending cleanup. Auto-rejects PENDING requests older than 30 days
 * (with a "we got busy, please re-apply" email) and emails the platform admin
 * a digest reminder of PENDING requests aged past 7 days but not yet auto-
 * rejected. Idempotent + safe to run repeatedly (e.g. daily cron). Only ever
 * touches PENDING rows — APPROVED/REJECTED are left alone.
 */
export async function runPendingCleanup(now: Date = new Date()): Promise<CleanupResult> {
  const rejectCutoff = new Date(now.getTime() - REJECT_AFTER_MS);
  const remindCutoff = new Date(now.getTime() - REMIND_AFTER_MS);

  // 1. Auto-reject the truly stale.
  const stale = await prismaGlobal.pendingTenant.findMany({
    where: { status: "PENDING", createdAt: { lt: rejectCutoff } },
  });
  for (const p of stale) {
    await prismaGlobal.pendingTenant.update({
      where: { id: p.id },
      data: { status: "REJECTED", decidedAt: now },
    });
    await sendEmail({
      to: p.requestedEmail,
      subject: `or9.space: your request for ${p.slug}.or9.space expired`,
      text: `We didn't get to your org request in time and it has expired.\n\nYou're very welcome to re-apply: https://or9.space/start-org`,
    });
  }

  // 2. Remind the admin about aging-but-not-yet-stale requests.
  const aging = await prismaGlobal.pendingTenant.findMany({
    where: { status: "PENDING", createdAt: { lt: remindCutoff, gte: rejectCutoff } },
    orderBy: { createdAt: "asc" },
  });
  if (aging.length > 0) {
    const lines = aging.map(
      (p) => `- ${p.name} (${p.slug}.or9.space) — ${p.requestedEmail}, ${Math.floor((now.getTime() - p.createdAt.getTime()) / 86400000)}d old`,
    );
    await sendEmail({
      to: process.env.PLATFORM_ADMIN_EMAILS?.split(",")[0]?.trim() ?? "dsmereski@gmail.com",
      subject: `or9.space: ${aging.length} org request(s) waiting on you`,
      text: `These org requests have been pending more than 7 days:\n\n${lines.join("\n")}\n\nReview: https://admin.or9.space/tenants/pending`,
    });
  }

  return { rejected: stale.length, reminders: aging.length };
}
