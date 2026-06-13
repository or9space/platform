import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/server/get-tenant";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";

export default async function TenantAdminLayout({ children }: { children: ReactNode }) {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();
  const accountId = await getSessionAccountId();
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m || !hasTier(m.tier, "COMMAND")) {
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">{tenant.name} — admin</h1>
        <p className="mt-3 text-neutral-400">You need COMMAND rank in this org. <a className="underline" href="/login">Sign in</a>.</p>
      </main>
    );
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800 p-4">
        <nav className="flex gap-6 text-sm">
          <a href="/admin" className="font-bold">{tenant.name} admin</a>
          <a href="/admin/config" className="text-neutral-400 hover:text-neutral-100">Configuration</a>
          <a href="/admin/directory" className="text-neutral-400 hover:text-neutral-100">Directory</a>
          <a href="/admin/integrations" className="text-neutral-400 hover:text-neutral-100">Integrations</a>
          <a href="/admin/billing" className="text-neutral-400 hover:text-neutral-100">Billing</a>
          <a href="/" className="text-neutral-400 hover:text-neutral-100">View site</a>
        </nav>
      </header>
      <main className="mx-auto max-w-2xl p-6">{children}</main>
    </div>
  );
}
