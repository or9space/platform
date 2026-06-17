import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { ApplyForm } from "@/components/recruitment/recruitment-client";

/**
 * PUBLIC apply form — no auth required. Anonymous visitors submit an
 * application that OFFICER+ reviews at /recruitment. Self-gates on the
 * `recruitment` feature flag.
 */
export default async function ApplyPage() {
  const ctx = await getFullTenantContext();
  if (!ctx || !isFeatureEnabled(ctx.features, "recruitment")) notFound();
  const orgName = ctx.config.branding?.name ?? ctx.tenant.name;

  return (
    <main className="tenant-root bg-tactical-grid flex items-center justify-center p-6">
      <div className="w-full max-w-xl border border-border bg-surface mfd-cut-tl-br space-y-6 p-6">
        <div>
          <h1 className="text-stencil text-2xl text-text-primary">Join {orgName}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Fill out the form below to apply. Leadership will review your application.
          </p>
        </div>
        <ApplyForm orgName={orgName} />
      </div>
    </main>
  );
}
