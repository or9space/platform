import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getOperation, getMySignup } from "@/lib/queries/operations";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/operations/status-badge";
import { SignupControl } from "@/components/operations/signup-control";
import { StatusControl } from "@/components/operations/status-control";

export default async function OperationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const canManage = hasTier(viewer.tier, "OFFICER");

  const { id } = await params;
  const tenantCtx = makeTenantContext(ctx.tenant.id);
  const op = await getOperation(tenantCtx, id);
  if (!op) notFound();
  const mine = await getMySignup(tenantCtx, id, viewer.id);

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <a href="/operations" className="text-sm text-neutral-400 underline hover:text-neutral-100">← Operations</a>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={op.status} />
              <h1 className="text-2xl font-bold">{op.title}</h1>
            </div>
            <p className="mt-2 text-neutral-300">
              {op.scheduledAt ? formatDateTime(op.scheduledAt) : "Unscheduled"}{op.location ? ` · ${op.location}` : ""}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Created by {op.createdByName}</p>
          </div>
        </div>
      </div>

      {canManage && <StatusControl operationId={op.id} current={op.status} />}

      {op.description && <p className="whitespace-pre-wrap text-neutral-200">{op.description}</p>}

      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-widest text-neutral-500">[ Sign up ]</h2>
        <SignupControl operationId={op.id} joined={mine !== null} currentRole={mine?.role ?? null} />
      </section>

      <section>
        <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-neutral-500">
          [ Crew · {op.signups.length} ]
        </h2>
        {op.signups.length === 0 ? (
          <p className="text-sm text-neutral-500">No one signed up yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {op.signups.map((s) => (
              <li key={s.membershipId} className="flex items-center justify-between">
                <a href={`/members/${s.username}`} className="text-neutral-200 hover:underline">{s.name}</a>
                {s.role && <span className="font-mono text-xs text-neutral-500">{s.role}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
