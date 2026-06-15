import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listOperations, OPERATION_STATUSES, type OperationRow } from "@/lib/queries/operations";
import { formatDateTime } from "@/lib/format";
import { StatusBadge, STATUS_LABELS } from "@/components/operations/status-badge";

export default async function OperationsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const ops = await listOperations(makeTenantContext(ctx.tenant.id));
  const byStatus = new Map<string, OperationRow[]>();
  for (const s of OPERATION_STATUSES) byStatus.set(s, []);
  for (const o of ops) byStatus.get(o.status)?.push(o);

  // Show the live lanes prominently; collapse the terminal ones.
  const lanes = OPERATION_STATUSES.filter((s) => (byStatus.get(s)?.length ?? 0) > 0);

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Operations</h1>
        {canManage && (
          <a href="/operations/new" className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900">
            New operation
          </a>
        )}
      </div>

      {ops.length === 0 ? (
        <p className="text-sm text-neutral-500">No operations yet.</p>
      ) : (
        <div className="space-y-8">
          {lanes.map((status) => (
            <section key={status}>
              <h2 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neutral-500">
                {STATUS_LABELS[status]} <span className="text-neutral-700">· {byStatus.get(status)!.length}</span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {byStatus.get(status)!.map((o) => (
                  <li key={o.id}>
                    <a href={`/operations/${o.id}`}
                      className="block rounded border border-neutral-800 p-4 transition-colors hover:border-neutral-600">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-neutral-100">{o.title}</p>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        {o.scheduledAt ? formatDateTime(o.scheduledAt) : "Unscheduled"}
                        {o.location ? ` · ${o.location}` : ""} · {o.signupCount} signed up
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
