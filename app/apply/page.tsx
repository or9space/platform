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
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Join {orgName}</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Fill out the form below to apply. Leadership will review your application.
        </p>
      </div>
      <ApplyForm orgName={orgName} />
    </main>
  );
}
