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
import { makeTenantContext } from "@/lib/tenant";
import { getPublicOrgStats } from "@/lib/queries/public-org-stats";
import { TenantPublicNav } from "@/components/tenant/public-nav";
import { TenantLanding } from "@/components/landing/tenant-landing";

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

  // Logged-out visitor on a tenant host — public landing (FG-style).
  const stats = await getPublicOrgStats(makeTenantContext(tenant.id));
  return (
    <div className="tenant-root">
      <TenantPublicNav brandName={cfg.branding.name} logoUrl={cfg.branding.logoUrl} />
      <TenantLanding
        brandName={cfg.branding.name}
        tagline={cfg.branding.tagline}
        description={cfg.branding.description}
        logoUrl={cfg.branding.logoUrl}
        stats={stats}
      />
    </div>
  );
}
