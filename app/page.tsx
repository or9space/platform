import { getCurrentTenant } from "@/lib/server/get-tenant";
import { resolveTenantConfig } from "@/lib/config";

export default async function HomePage() {
  const tenant = await getCurrentTenant();

  if (!tenant) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-xl space-y-4 text-center">
          <h1 className="text-4xl font-bold">or9.space</h1>
          <p className="text-neutral-400">
            The org HQ for serious Star Citizen crews. Coming soon.
          </p>
          <a href="/start-org" className="inline-block rounded bg-neutral-100 px-4 py-2 font-semibold text-neutral-900">
            Start your org
          </a>
        </div>
      </main>
    );
  }

  const cfg = await resolveTenantConfig(tenant.plan);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-xl space-y-4 text-center">
        <h1 className="text-4xl font-bold">{cfg.branding.name}</h1>
        <p className="text-neutral-400">
          Tenant: <code>{tenant.slug}</code> · Plan: <code>{tenant.plan}</code>
        </p>
        <p className="text-sm text-neutral-500">
          Phase 0 — platform skeleton. Phase 1 starts soon.
        </p>
      </div>
    </main>
  );
}
