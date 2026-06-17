import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getProject, TICKET_STATUSES, type TicketRow } from "@/lib/queries/projects";
import { TicketCreateForm, TicketCard, DeleteProjectButton } from "@/components/projects/projects-client";
import { MfdPanel } from "@/components/ui/mfd";
import { ClipboardList } from "lucide-react";

const COLUMN_LABEL: Record<string, string> = { TODO: "TO DO", IN_PROGRESS: "IN PROGRESS", DONE: "DONE" };

export default async function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const canManage = hasTier(viewer.tier, "OFFICER");

  const { id } = await params;
  const project = await getProject(makeTenantContext(ctx.tenant.id), id);
  if (!project) notFound();

  const byStatus = new Map<string, TicketRow[]>();
  for (const s of TICKET_STATUSES) byStatus.set(s, []);
  for (const t of project.tickets) byStatus.get(t.status)?.push(t);

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div>
            <a href="/projects" className="mfd-label text-xs hover:text-primary transition-colors">← PROJECTS</a>
            <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-text-muted">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-4">
          <TicketCreateForm projectId={project.id} />
          {canManage && <DeleteProjectButton id={project.id} />}
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid gap-4 md:grid-cols-3">
        {TICKET_STATUSES.map((status) => {
          const tickets = byStatus.get(status)!;
          return (
            <MfdPanel
              key={status}
              chassis={status === "DONE" ? "primary" : status === "IN_PROGRESS" ? "amber" : "neutral"}
              title={<span>[ {COLUMN_LABEL[status]} ]</span>}
              titleAside={<span className="mfd-readout text-xs">{tickets.length}</span>}
              bodyPadding="sm"
            >
              <div className="space-y-2">
                {tickets.length === 0 ? (
                  <p className="mfd-label py-4 text-center">—</p>
                ) : (
                  tickets.map((t) => (
                    <TicketCard
                      key={t.id}
                      projectId={project.id}
                      id={t.id}
                      title={t.title}
                      description={t.description}
                      status={t.status}
                      assigneeName={t.assigneeUsername}
                      canDelete={canManage}
                    />
                  ))
                )}
              </div>
            </MfdPanel>
          );
        })}
      </div>
    </div>
  );
}
