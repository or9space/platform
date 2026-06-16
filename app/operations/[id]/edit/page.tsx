import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getOperation } from "@/lib/queries/operations";
import { toLocalInputValue } from "@/lib/format";
import { OperationForm } from "@/components/operations/operation-form";

export default async function EditOperationPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  const { id } = await params;
  const op = await getOperation(makeTenantContext(ctx.tenant.id), id);
  if (!op) notFound();

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit operation</h1>
        <a href={`/operations/${id}`} className="text-sm text-text-secondary underline hover:text-text-primary">← Cancel</a>
      </div>
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
    </main>
  );
}
