import { notFound } from "next/navigation";
import { Swords } from "lucide-react";
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
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
            <Swords className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Edit Operation</h1>
            <p className="text-sm text-text-muted">Modify mission parameters</p>
          </div>
        </div>
        <a
          href={`/operations/${id}`}
          className="font-mono text-xs text-text-muted hover:text-primary transition-colors uppercase tracking-widest"
        >
          ← Cancel
        </a>
      </div>

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
