import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getCurrentTenant } from "@/lib/server/get-tenant";
import { resolveTenantConfig, getTenantDbOverrides } from "@/lib/config";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { TenantShell } from "@/components/tenant-shell";
import { OrgDashboard } from "@/components/dashboard/org-dashboard";
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

  const full = await getFullTenantContext();
  const cfg = full?.config ?? (await resolveTenantConfig(tenant.plan, await getTenantDbOverrides(tenant.id)));
  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);

  // Signed-in member: show the full org dashboard inside the tactical shell.
  if (viewer && full) {
    return (
      <TenantShell>
        <OrgDashboard
          tenantId={tenant.id}
          features={full.features}
          viewer={viewer}
        />
      </TenantShell>
    );
  }

  // Logged-out visitor on a tenant host — tactical landing.
  return (
    <main className="tenant-root bg-tactical-grid flex items-center justify-center p-8">
      <div className="max-w-xl space-y-5 text-center">
        <h1 className="text-stencil text-5xl text-text-primary">{cfg.branding.name}</h1>
        {cfg.branding.tagline && (
          <p className="text-text-secondary">{cfg.branding.tagline}</p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <a href="/login" className="rounded-md border border-border px-5 py-2 text-sm text-text-secondary transition-colors hover:border-border-light hover:text-text-primary">
            Sign In
          </a>
          <a href="/apply" className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-fg-cream transition-colors hover:bg-primary-hover">
            Enlist
          </a>
        </div>
        <div className="pt-4"><AdSlot slot="sidebar-bottom" /></div>
      </div>
    </main>
  );
}
