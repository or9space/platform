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
        <p className="mt-3 text-text-secondary">You need COMMAND rank in this org. <a className="underline" href="/login">Sign in</a>.</p>
      </main>
    );
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-border p-4">
        <nav className="flex gap-6 text-sm">
          <a href="/admin" className="font-bold">{tenant.name} admin</a>
          <a href="/admin/config" className="text-text-secondary hover:text-text-primary">Configuration</a>
          <a href="/admin/directory" className="text-text-secondary hover:text-text-primary">Directory</a>
          <a href="/admin/integrations" className="text-text-secondary hover:text-text-primary">Integrations</a>
          <a href="/admin/billing" className="text-text-secondary hover:text-text-primary">Billing</a>
          <a href="/" className="text-text-secondary hover:text-text-primary">View site</a>
        </nav>
      </header>
      <main className="mx-auto max-w-2xl p-6">{children}</main>
    </div>
  );
}
