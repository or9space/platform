import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { TenantPublicNav } from "@/components/tenant/public-nav";
import { RecruitTerminal } from "@/components/recruitment/recruit-terminal";

export const metadata: Metadata = { title: "Enlist" };

/**
 * PUBLIC apply page — no auth required. Anonymous visitors submit an
 * application that OFFICER+ reviews at /recruitment. Self-gates on the
 * `recruitment` feature flag. Ported to the Freedom Guards recruit layout.
 */
export default async function ApplyPage() {
  const ctx = await getFullTenantContext();
  if (!ctx || !isFeatureEnabled(ctx.features, "recruitment")) notFound();
  const orgName = ctx.config.branding?.name ?? ctx.tenant.name;
  const discordEnabled = !!process.env.AUTH_DISCORD_ID;

  return (
    <div className="tenant-root">
      <TenantPublicNav brandName={ctx.config.branding.name} logoUrl={ctx.config.branding.logoUrl} />
      <main>
        <RecruitTerminal orgName={orgName} logoUrl={ctx.config.branding.logoUrl} discordEnabled={discordEnabled} />
      </main>
    </div>
  );
}
