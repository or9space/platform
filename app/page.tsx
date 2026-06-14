import { getCurrentTenant } from "@/lib/server/get-tenant";
import { resolveTenantConfig, getTenantDbOverrides } from "@/lib/config";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { TenantNav } from "@/components/tenant-nav";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Hero } from "@/components/marketing/hero";
import { FeatureLedger } from "@/components/marketing/feature-ledger";
import { ProofBand } from "@/components/marketing/proof-band";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Cta } from "@/components/marketing/cta";
import { AdSlot } from "@/components/ads/ad-slot";

export default async function HomePage() {
  const tenant = await getCurrentTenant();

  if (!tenant) {
    return (
      <>
        <MarketingNav />
        <Hero />
        <ProofBand />
        <FeatureLedger />
        <PricingTable />
        <Cta />
        <MarketingFooter />
      </>
    );
  }

  const cfg = await resolveTenantConfig(tenant.plan, await getTenantDbOverrides(tenant.id));
  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);

  // Signed-in member: show the org chrome + a real landing, not a sign-in prompt.
  if (viewer) {
    return (
      <div className="min-h-screen">
        <TenantNav />
        <main className="mx-auto max-w-2xl space-y-4 p-8">
          <h1 className="text-3xl font-bold">{cfg.branding.name}</h1>
          <p className="text-neutral-400">
            Signed in as{" "}
            <strong className="text-neutral-200">{viewer.displayName ?? viewer.username}</strong>. Use
            the nav above to jump into forums, members, loot and more.
          </p>
          <AdSlot slot="sidebar-bottom" />
        </main>
      </div>
    );
  }

  // Logged-out visitor on a tenant host.
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-xl space-y-4 text-center">
        <h1 className="text-4xl font-bold">{cfg.branding.name}</h1>
        <p className="text-neutral-400">
          Tenant: <code>{tenant.slug}</code> · Plan: <code>{tenant.plan}</code>
        </p>
        <p className="text-sm text-neutral-500">
          <a className="underline" href="/login">Sign in</a> · <a className="underline" href="/register">Join</a>
        </p>
        <AdSlot slot="sidebar-bottom" />
      </div>
    </main>
  );
}
