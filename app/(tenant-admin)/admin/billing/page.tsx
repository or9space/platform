import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { ext } from "@/lib/extensions/registry";
import { UpgradeButton } from "./upgrade-button";
import { CreditCard } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";

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
    <div className="space-y-6 animate-page-enter">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <CreditCard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">BILLING</h1>
          <p className="text-sm text-text-muted">Plan and subscription management</p>
        </div>
      </div>

      {!hasProvider && (
        <MfdPanel chassis="neutral" title={<span>[ DEPLOYMENT STATUS ]</span>} bodyPadding="md">
          <div className="space-y-2">
            <p className="mfd-label text-text-primary">SELF-HOSTED DEPLOYMENT</p>
            <p className="text-sm text-text-secondary">
              This deployment doesn&apos;t have hosted billing. The platform is free and
              open-source to self-host (AGPL). Paid plans are available on the hosted{" "}
              <a href="/pricing" className="underline hover:text-text-primary">
                or9.space
              </a>
              .
            </p>
          </div>
        </MfdPanel>
      )}

      {hasProvider && plan === "FREE" && (
        <MfdPanel chassis="amber" title={<span>[ PLAN STATUS ]</span>} titleAside={<span className="mfd-readout text-amber">FREE</span>} bodyPadding="md">
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Upgrade to unlock paid features including the Discord bot, custom
              domains, and more.
            </p>
            {priceId ? (
              <UpgradeButton tenantId={tenant.id} priceId={priceId} />
            ) : (
              <p className="mfd-label text-amber">
                BILLING PRICE NOT CONFIGURED — contact your platform administrator.
              </p>
            )}
          </div>
        </MfdPanel>
      )}

      {hasProvider && plan === "PAID" && (
        <MfdPanel chassis="primary" title={<span>[ PLAN STATUS ]</span>} titleAside={<span className="mfd-readout text-primary">PAID</span>} bodyPadding="md">
          <p className="text-sm text-text-secondary">
            You&apos;re on the Paid plan. To manage or cancel your subscription,
            use the customer portal (available via your billing confirmation email
            or contact support).
          </p>
        </MfdPanel>
      )}
    </div>
  );
}
