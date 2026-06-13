import { getCurrentTenant } from "@/lib/server/get-tenant";
import { resolveTenantConfig, getTenantDbOverrides } from "@/lib/config";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Hero } from "@/components/marketing/hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Cta } from "@/components/marketing/cta";

export default async function HomePage() {
  const tenant = await getCurrentTenant();

  if (!tenant) {
    return (
      <>
        <MarketingNav />
        <Hero />
        <FeatureGrid />
        <PricingTable />
        <Cta />
        <MarketingFooter />
      </>
    );
  }

  const cfg = await resolveTenantConfig(tenant.plan, await getTenantDbOverrides(tenant.id));

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-xl space-y-4 text-center">
        <h1 className="text-4xl font-bold">{cfg.branding.name}</h1>
        <p className="text-neutral-400">
          Tenant: <code>{tenant.slug}</code> · Plan: <code>{tenant.plan}</code>
        </p>
        <p className="text-sm text-neutral-500">
          Phase 1 — tenant lifecycle live. <a className="underline" href="/login">Sign in</a> · <a className="underline" href="/register">Join</a>
        </p>
      </div>
    </main>
  );
}
