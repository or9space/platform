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
      <div className="p-3 sm:p-6 animate-page-enter">
        <div className="mx-auto max-w-md text-center py-16">
          <h1 className="text-2xl font-bold text-text-primary">{tenant.name} — COMMAND ACCESS REQUIRED</h1>
          <p className="mt-3 text-text-secondary">You need COMMAND rank in this org. <a className="underline hover:text-text-primary" href="/login">Sign in</a>.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-surface-elevated px-4 py-3">
        <nav className="flex flex-wrap gap-1 text-xs">
          <a href="/admin" className="mfd-label px-2 py-1 font-bold text-primary hover:text-text-primary">{tenant.name} <span className="text-text-muted">COMMAND</span></a>
          <span className="mfd-label px-1 text-border">|</span>
          <a href="/admin/config" className="mfd-label px-2 py-1 text-text-secondary hover:text-text-primary">[ CONFIG ]</a>
          <a href="/admin/directory" className="mfd-label px-2 py-1 text-text-secondary hover:text-text-primary">[ DIRECTORY ]</a>
          <a href="/admin/integrations" className="mfd-label px-2 py-1 text-text-secondary hover:text-text-primary">[ INTEGRATIONS ]</a>
          <a href="/admin/members" className="mfd-label px-2 py-1 text-text-secondary hover:text-text-primary">[ MEMBERS ]</a>
          <a href="/admin/billing" className="mfd-label px-2 py-1 text-text-secondary hover:text-text-primary">[ BILLING ]</a>
          <span className="mfd-label px-1 text-border">|</span>
          <a href="/" className="mfd-label px-2 py-1 text-text-muted hover:text-text-secondary">← SITE</a>
        </nav>
      </header>
      <div className="p-3 sm:p-6">{children}</div>
    </div>
  );
}
