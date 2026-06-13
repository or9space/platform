# Billing — OSS Surface & Private Overlay

## Overview

The OSS repo ships only a **noOp billing surface**. All real Stripe logic lives in
the private `platform-paid` overlay package. This document describes how the overlay
plugs into the OSS extension system.

---

## How the Private Overlay Registers a Stripe BillingProvider

At module load time the `platform-paid` package calls `ext.register` on the shared
singleton before any request is handled:

```ts
// platform-paid/src/billing/index.ts  (private repo — not in this codebase)
import { ext } from "@or9/platform/lib/extensions/registry";
import { stripeBillingProvider } from "./stripe-provider";

// Called once at startup (e.g. in app/layout.tsx or a Next.js instrumentation hook)
ext.register("billingProvider", stripeBillingProvider);
```

After this call `ext.billingProvider.kind === "stripe"` and the `/admin/billing`
page renders the upgrade button instead of the self-host message.

---

## Required Environment Variables

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_…` / `sk_test_…`). Server-only. |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) for verifying Stripe events. Server-only. |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | Price ID (`price_…`) surfaced to the upgrade button. Set per environment. |

All three must be present in `.env.local` (or the deployment environment) for
the paid overlay to function. The OSS repo does **not** require any of them.

---

## Webhook Responsibilities (Overlay)

The overlay must expose a POST endpoint (e.g. `/api/webhooks/stripe`) that:

1. Reads the raw request body and the `stripe-signature` header.
2. Verifies the event with `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`.
3. Handles the following event types:

| Event | Action |
|---|---|
| `checkout.session.completed` | Extract `metadata.tenantId`; set `tenant.plan = "PAID"` via `prismaGlobal`. |
| `customer.subscription.updated` (status `active`) | Ensure `tenant.plan = "PAID"`. |
| `customer.subscription.deleted` | Set `tenant.plan = "FREE"` via `prismaGlobal`. |
| `invoice.payment_failed` (after grace period) | Set `tenant.plan = "FREE"`. |

Example snippet:

```ts
// Only illustrative — real implementation lives in platform-paid.
const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);

if (event.type === "checkout.session.completed") {
  const session = event.data.object as Stripe.Checkout.Session;
  const tenantId = session.metadata?.tenantId;
  if (tenantId) {
    await prismaGlobal.tenant.update({ where: { id: tenantId }, data: { plan: "PAID" } });
  }
}

if (event.type === "customer.subscription.deleted") {
  const sub = event.data.object as Stripe.Subscription;
  const tenantId = sub.metadata?.tenantId;
  if (tenantId) {
    await prismaGlobal.tenant.update({ where: { id: tenantId }, data: { plan: "FREE" } });
  }
}
```

The `tenantId` must be stored in Stripe metadata when creating the Checkout Session:

```ts
// Inside stripeBillingProvider.createCheckoutSession({ tenantId, priceId })
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: priceId, quantity: 1 }],
  metadata: { tenantId },
  success_url: `${baseUrl}/admin/billing?upgraded=1`,
  cancel_url: `${baseUrl}/admin/billing`,
});
return { url: session.url! };
```

---

## OSS Self-Host Experience

When `ext.billingProvider.kind === "noop"` (the default in any OSS deployment):

- `/admin/billing` shows a static panel explaining the platform is free under AGPL.
- `startUpgradeAction` / `startUpgradeCore` return `{ ok: false }` with a
  message directing users to the hosted `or9.space` for paid plans.
- No Stripe or payment credentials are needed.
- The page is still COMMAND-gated — only COMMAND-tier members can view it.
