import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { notFound } from "next/navigation";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { DirectoryForm } from "./directory-form";
import { Globe } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";

export default async function DirectoryPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const { tenant } = ctx;

  const m = await getViewerMembership(tenant.id, await getSessionAccountId());
  if (!m || !hasTier(m.tier, "COMMAND")) return notFound();

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Globe className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">DIRECTORY</h1>
          <p className="text-sm text-text-muted">
            Control visibility on the{" "}
            <a href="/orgs" className="underline hover:text-text-primary">
              public or9.space directory
            </a>
          </p>
        </div>
      </div>
      <MfdPanel chassis="neutral" title={<span>[ LISTING SETTINGS ]</span>} bodyPadding="md">
        <DirectoryForm
          tenantId={tenant.id}
          initial={{
            isListed: tenant.isListed,
            tagline: tenant.tagline ?? "",
          }}
        />
      </MfdPanel>
    </div>
  );
}
