import { notFound } from "next/navigation";
import { Swords, Users, Calendar, MapPin, User, Target, FileText } from "lucide-react";
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
import { AarEditor } from "@/components/operations/aar-editor";
import { MfdPanel, MfdReadout } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";

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

      <PageHeader
        icon={Swords}
        title={op.title}
        subtitle="Operation briefing and crew roster"
        actions={<StatusBadge status={op.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column (2/3) — mirrors FG's lg:col-span-2 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mission data panel — primary chassis, FG-style meta readouts + description */}
          <MfdPanel
            chassis="primary"
            title={<span>[ MISSION DATA ]</span>}
            titleAside={canManage && (
              <StatusControl operationId={op.id} current={op.status} />
            )}
            bodyPadding="md"
          >
            <div className="space-y-4">
              {/* Meta readouts row — matches FG's Calendar / MapPin / User row */}
              <div className="flex flex-wrap gap-6 border-b border-border/60 pb-4">
                <MfdReadout
                  label="SCHEDULED"
                  value={
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-amber opacity-70" aria-hidden="true" />
                      {op.scheduledAt ? formatDateTime(op.scheduledAt) : "TBD"}
                    </span>
                  }
                  tone="amber"
                  size="sm"
                />
                {op.location && (
                  <MfdReadout
                    label="LOCATION"
                    value={
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary opacity-70" aria-hidden="true" />
                        {op.location}
                      </span>
                    }
                    tone="primary"
                    size="sm"
                  />
                )}
                <MfdReadout
                  label="CREATED BY"
                  value={
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
                      {op.createdByName}
                    </span>
                  }
                  tone="muted"
                  size="sm"
                />
              </div>

              {/* Briefing text — FG shows description in CardContent */}
              {op.description && (
                <p className="whitespace-pre-wrap text-sm text-text-secondary leading-relaxed">{op.description}</p>
              )}
            </div>
          </MfdPanel>

          {/* Objectives panel — only when objectives are set */}
          {op.objectives.length > 0 && (
            <MfdPanel
              chassis="neutral"
              title={
                <span className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" aria-hidden="true" />
                  [ OBJECTIVES ]
                </span>
              }
              bodyPadding="md"
            >
              <ol className="space-y-2">
                {op.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/40 font-mono text-xs text-primary">
                      {i + 1}
                    </span>
                    {obj}
                  </li>
                ))}
              </ol>
            </MfdPanel>
          )}

          {/* After-Action Report — show when status is DEBRIEFING/COMPLETED/ARCHIVED, or when aar exists */}
          {(op.aar || ["DEBRIEFING", "COMPLETED", "ARCHIVED"].includes(op.status)) && (
            <MfdPanel
              chassis="neutral"
              title={
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  [ AFTER-ACTION REPORT ]
                </span>
              }
              bodyPadding="md"
            >
              <AarEditor
                operationId={op.id}
                initialAar={op.aar}
                canManage={canManage}
              />
            </MfdPanel>
          )}

          {/* Sign-up panel — neutral chassis, FG SignupButton equivalent */}
          <MfdPanel
            chassis="neutral"
            title={
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                [ SIGN UP ]
              </span>
            }
            bodyPadding="md"
          >
            <SignupControl operationId={op.id} joined={mine !== null} currentRole={mine?.role ?? null} />
          </MfdPanel>
        </div>

        {/* Sidebar (1/3) — crew roster, matches FG's Signups card */}
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
              <ul className="divide-y divide-border/40 py-1">
                {op.signups.map((s) => (
                  <li key={s.membershipId} className="flex items-center justify-between gap-2 py-2">
                    <a
                      href={`/members/${s.username}`}
                      className="min-w-0 flex-1 truncate text-sm text-text-primary hover:text-primary transition-colors"
                    >
                      {s.name}
                    </a>
                    {s.role && (
                      <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-muted">
                        {s.role}
                      </span>
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
