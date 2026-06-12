"use server";

import { z } from "zod";
import { prismaGlobal } from "../db";
import { checkRateLimit, SIGNUP_LIMIT } from "../rate-limit";
import { verifyTurnstile } from "../turnstile";
import { sendEmail } from "../email";

const RESERVED_SLUGS = new Set(["www", "admin", "support", "api", "demo-staging", "auth", "mail", "blog"]);

const SignupSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9-]{2,40}$/, "Slug: lowercase letters, digits, dashes; 3-41 chars"),
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  description: z.string().min(1).max(500),
  turnstileToken: z.string().nullable(),
});

export type SignupResult = { ok: true } | { ok: false; error: string };

export async function createPendingTenant(input: z.infer<typeof SignupSchema>): Promise<SignupResult> {
  const parsed = SignupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { slug, name, email, description, turnstileToken } = parsed.data;

  if (RESERVED_SLUGS.has(slug)) return { ok: false, error: "That subdomain is reserved" };

  const { allowed } = checkRateLimit(`signup:${email.toLowerCase()}`, SIGNUP_LIMIT.maxRequests, SIGNUP_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — try again later" };

  if (!(await verifyTurnstile(turnstileToken))) return { ok: false, error: "Captcha failed" };

  const [liveClash, pendingClash] = await Promise.all([
    prismaGlobal.tenant.findUnique({ where: { slug } }),
    prismaGlobal.pendingTenant.findFirst({ where: { slug, status: "PENDING" } }),
  ]);
  if (liveClash || pendingClash) return { ok: false, error: "That subdomain is taken" };

  await prismaGlobal.pendingTenant.create({
    data: { slug, name, requestedEmail: email.toLowerCase(), description },
  });

  await sendEmail({
    to: process.env.PLATFORM_ADMIN_EMAILS?.split(",")[0]?.trim() ?? "dsmereski@gmail.com",
    subject: `or9.space: new org request — ${name} (${slug})`,
    text: `${name} requested ${slug}.or9.space\nContact: ${email}\n\n${description}\n\nReview: https://admin.or9.space/tenants/pending`,
  });

  return { ok: true };
}
