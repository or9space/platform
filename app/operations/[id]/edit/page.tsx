import { notFound } from "next/navigation";
import { Swords } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getOperation } from "@/lib/queries/operations";
import { toLocalInputValue } from "@/lib/format";
import { OperationForm } from "@/components/operations/operation-form";
import { MfdPanel } from "@/components/ui/mfd";

export default async function EditOperationPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  const { id } = await params;
  const op = await getOperation(makeTenantContext(ctx.tenant.id), id);
  if (!op) notFound();

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader
        icon={Swords}
        title="Edit Operation"
        subtitle="Modify mission parameters"
        actions={
          <a
            href={`/operations/${id}`}
            className="font-mono text-xs text-text-muted hover:text-primary transition-colors uppercase tracking-widest"
          >
            ← Cancel
          </a>
        }
      />

      <div className="mx-auto max-w-lg">
        <MfdPanel chassis="neutral" title={<span>[ MISSION PARAMETERS ]</span>} bodyPadding="md">
          <OperationForm
            operationId={id}
            initial={{
              title: op.title,
              description: op.description ?? "",
              status: op.status,
              scheduledAt: op.scheduledAt ? toLocalInputValue(op.scheduledAt) : "",
              location: op.location ?? "",
            }}
          />
        </MfdPanel>
      </div>
    </div>
  );
}
