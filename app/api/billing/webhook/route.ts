import { prismaGlobal, type TenantPlan } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook endpoint. The actual verification + event handling lives in the
 * private `platform-paid` overlay (so the OSS repo carries no Stripe code). This
 * route reads the RAW body + signature and hands them to the overlay's handler
 * along with a `setTenantPlan` callback that writes via prismaGlobal.
 *
 * Without the overlay (OSS / self-host) the dynamic import throws -> 404, and no
 * DB write is ever attempted. With the overlay, the handler verifies the Stripe
 * signature (STRIPE_WEBHOOK_SECRET) BEFORE invoking setTenantPlan, so plan flips
 * are signature-gated.
 */
export async function POST(req: Request): Promise<Response> {
  let handler: {
    handleStripeWebhook: (
      raw: string,
      sig: string,
      setTenantPlan: (tenantId: string, plan: TenantPlan) => Promise<void>,
    ) => Promise<{ received: true } | { error: string }>;
  };
  try {
    const spec = "platform-paid/src/register";
    handler = (await import(/* webpackIgnore: true */ spec)) as typeof handler;
  } catch {
    return new Response("Billing is not enabled on this deployment", { status: 404 });
  }

  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text(); // RAW body — required for signature verification

  const res = await handler.handleStripeWebhook(raw, sig, async (tenantId, plan) => {
    await prismaGlobal.tenant.update({ where: { id: tenantId }, data: { plan } });
  });

  if ("error" in res) return new Response(res.error, { status: 400 });
  return Response.json(res);
}
