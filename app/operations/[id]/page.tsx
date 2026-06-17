import { notFound } from "next/navigation";
import { Swords, Users } from "lucide-react";
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
import { MfdPanel, MfdReadout } from "@/components/ui/mfd";

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
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Back link */}
      <a
        href="/operations"
        className="inline-flex items-center gap-1 font-mono text-xs text-text-muted hover:text-primary transition-colors uppercase tracking-widest"
      >
        ← Operations
      </a>

      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Swords className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary">{op.title}</h1>
            <StatusBadge status={op.status} />
          </div>
          <p className="text-sm text-text-muted">Operation briefing and crew roster</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mission data panel */}
          <MfdPanel
            chassis="primary"
            title={<span>[ MISSION DATA ]</span>}
            titleAside={canManage && (
              <StatusControl operationId={op.id} current={op.status} />
            )}
            bodyPadding="md"
          >
            <div className="space-y-4">
              {/* Readouts row */}
              <div className="flex flex-wrap gap-6 border-b border-border/60 pb-4">
                <MfdReadout
                  label="SCHEDULED"
                  value={op.scheduledAt ? formatDateTime(op.scheduledAt) : "TBD"}
                  tone="amber"
                  size="sm"
                />
                {op.location && (
                  <MfdReadout label="LOCATION" value={op.location} tone="primary" size="sm" />
                )}
                <MfdReadout
                  label="CREATED BY"
                  value={op.createdByName}
                  tone="muted"
                  size="sm"
                />
              </div>

              {op.description && (
                <p className="whitespace-pre-wrap text-sm text-text-secondary">{op.description}</p>
              )}
            </div>
          </MfdPanel>

          {/* Sign up panel */}
          <MfdPanel
            chassis="neutral"
            title={<span>[ SIGN UP ]</span>}
            bodyPadding="md"
          >
            <SignupControl operationId={op.id} joined={mine !== null} currentRole={mine?.role ?? null} />
          </MfdPanel>
        </div>

        {/* Sidebar — crew roster */}
        <div className="space-y-4">
          <MfdPanel
            chassis="neutral"
            title={
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                [ CREW · {op.signups.length} ]
              </span>
            }
            bodyPadding="sm"
          >
            {op.signups.length === 0 ? (
              <p className="py-2 text-sm text-text-muted">No one signed up yet.</p>
            ) : (
              <ul className="space-y-1 py-1">
                {op.signups.map((s) => (
                  <li key={s.membershipId} className="flex items-center justify-between py-1">
                    <a
                      href={`/members/${s.username}`}
                      className="text-sm text-text-primary hover:text-primary hover:underline transition-colors"
                    >
                      {s.name}
                    </a>
                    {s.role && (
                      <span className="font-mono text-xs text-text-muted">{s.role}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </MfdPanel>
        </div>
      </div>
    </div>
  );
}
