import { prismaGlobal } from "@/lib/db";
import { handleStripeWebhook } from "@/lib/extensions/overlay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook endpoint. Verification + event handling live in the overlay
 * (via the `lib/extensions/overlay` seam — no-op stub in OSS, real platform-paid
 * handler on the hosted build). This route reads the RAW body + signature and
 * hands them to the handler with a `setTenantPlan` callback that writes via
 * prismaGlobal. The handler verifies the Stripe signature BEFORE invoking the
 * callback, so plan flips are signature-gated. The OSS stub returns an error
 * (billing not enabled) without touching the DB.
 */
export async function POST(req: Request): Promise<Response> {
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text(); // RAW body — required for signature verification

  const res = await handleStripeWebhook(raw, sig, async (tenantId, plan) => {
    await prismaGlobal.tenant.update({ where: { id: tenantId }, data: { plan } });
  });

  if ("error" in res) return new Response(res.error, { status: 400 });
  return Response.json(res);
}
