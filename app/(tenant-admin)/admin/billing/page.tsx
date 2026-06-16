import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { ext } from "@/lib/extensions/registry";
import { UpgradeButton } from "./upgrade-button";

export default async function BillingPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const { tenant } = ctx;

  // Guard BEFORE reading any billing state so the RSC payload never streams
  // billing data to non-COMMAND members. Mirror the pattern from integrations/page.tsx.
  const accountId = await getSessionAccountId();
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m || !hasTier(m.tier, "COMMAND")) return notFound();

  const plan = tenant.plan;
  const hasProvider = ext.billingProvider.kind !== "noop";
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? "";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Billing</h2>

      {!hasProvider && (
        <div className="rounded border border-border-light bg-surface p-5 space-y-2">
          <p className="font-medium">Self-hosted deployment</p>
          <p className="text-sm text-text-secondary">
            This deployment doesn&apos;t have hosted billing. The platform is free and
            open-source to self-host (AGPL). Paid plans are available on the hosted{" "}
            <a href="/pricing" className="underline hover:text-text-primary">
              or9.space
            </a>
            .
          </p>
        </div>
      )}

      {hasProvider && plan === "FREE" && (
        <div className="rounded border border-border-light bg-surface p-5 space-y-4">
          <div>
            <p className="font-medium">Current plan: Free</p>
            <p className="text-sm text-text-secondary mt-1">
              Upgrade to unlock paid features including the Discord bot, custom
              domains, and more.
            </p>
          </div>
          {priceId ? (
            <UpgradeButton tenantId={tenant.id} priceId={priceId} />
          ) : (
            <p className="text-sm text-amber">
              Billing price not configured — contact your platform administrator.
            </p>
          )}
        </div>
      )}

      {hasProvider && plan === "PAID" && (
        <div className="rounded border border-border-light bg-surface p-5 space-y-2">
          <p className="font-medium">Current plan: Paid</p>
          <p className="text-sm text-text-secondary">
            You&apos;re on the Paid plan. To manage or cancel your subscription,
            use the customer portal (available via your billing confirmation email
            or contact support).
          </p>
        </div>
      )}
    </div>
  );
}
