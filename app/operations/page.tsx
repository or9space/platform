import { notFound } from "next/navigation";
import { Swords } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listOperations, OPERATION_STATUSES, type OperationRow } from "@/lib/queries/operations";
import { formatDateTime } from "@/lib/format";
import { StatusBadge, STATUS_LABELS } from "@/components/operations/status-badge";
import { MfdPanel } from "@/components/ui/mfd";

export default async function OperationsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const ops = await listOperations(makeTenantContext(ctx.tenant.id));
  const byStatus = new Map<string, OperationRow[]>();
  for (const s of OPERATION_STATUSES) byStatus.set(s, []);
  for (const o of ops) byStatus.get(o.status)?.push(o);

  const lanes = OPERATION_STATUSES.filter((s) => (byStatus.get(s)?.length ?? 0) > 0);

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
            <Swords className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Operations</h1>
            <p className="text-sm text-text-muted">Mission planning and crew signups</p>
          </div>
        </div>
        {canManage && (
          <a
            href="/operations/new"
            className="inline-flex items-center gap-1.5 rounded border border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors mfd-cut-tl-br"
          >
            + New Operation
          </a>
        )}
      </div>

      {/* Stat bar */}
      <MfdPanel chassis="neutral" bodyPadding="sm">
        <div className="flex flex-wrap gap-6 py-1">
          <div className="flex flex-col gap-0.5">
            <span className="mfd-label">TOTAL OPS</span>
            <span className="font-mono font-semibold tabular-nums tracking-wide text-amber">{ops.length}</span>
          </div>
          {OPERATION_STATUSES.filter((s) => (byStatus.get(s)?.length ?? 0) > 0).map((s) => (
            <div key={s} className="flex flex-col gap-0.5">
              <span className="mfd-label">{STATUS_LABELS[s]?.toUpperCase() ?? s}</span>
              <span className="font-mono font-semibold tabular-nums tracking-wide text-primary">
                {byStatus.get(s)!.length}
              </span>
            </div>
          ))}
        </div>
      </MfdPanel>

      {/* Operations lanes */}
      {ops.length === 0 ? (
        <MfdPanel chassis="neutral" title={<span>[ OPERATIONS ]</span>} bodyPadding="md">
          <p className="text-sm text-text-muted">No operations yet.</p>
        </MfdPanel>
      ) : (
        <div className="space-y-6">
          {lanes.map((status) => (
            <MfdPanel
              key={status}
              chassis={status === "ACTIVE" ? "primary" : status === "DEBRIEFING" ? "amber" : "neutral"}
              title={
                <span>
                  [ {STATUS_LABELS[status]?.toUpperCase() ?? status} ·{" "}
                  <span className="text-text-muted">{byStatus.get(status)!.length}</span> ]
                </span>
              }
              bodyPadding="sm"
            >
              <ul className="grid gap-2 pt-1 sm:grid-cols-2">
                {byStatus.get(status)!.map((o) => (
                  <li key={o.id}>
                    <a
                      href={`/operations/${o.id}`}
                      className="block rounded border border-border bg-surface p-3 transition-colors hover:border-primary hover:bg-surface-elevated"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-text-primary">{o.title}</p>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="mt-1 font-mono text-xs text-text-muted">
                        {o.scheduledAt ? formatDateTime(o.scheduledAt) : "Unscheduled"}
                        {o.location ? ` · ${o.location}` : ""} · {o.signupCount} signed up
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </MfdPanel>
          ))}
        </div>
      )}
    </div>
  );
}
