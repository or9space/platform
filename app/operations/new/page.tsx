import { notFound } from "next/navigation";
import { Swords } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { OperationForm } from "@/components/operations/operation-form";
import { MfdPanel } from "@/components/ui/mfd";

export default async function NewOperationPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader
        icon={Swords}
        title="New Operation"
        subtitle="Define mission parameters and objectives"
        actions={
          <a
            href="/operations"
            className="font-mono text-xs text-text-muted hover:text-primary transition-colors uppercase tracking-widest"
          >
            ← Operations
          </a>
        }
      />

      <div className="mx-auto max-w-lg">
        <MfdPanel chassis="primary" title={<span>[ NEW MISSION ]</span>} bodyPadding="md">
          <OperationForm />
        </MfdPanel>
      </div>
    </div>
  );
}
