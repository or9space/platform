import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getProject, TICKET_STATUSES, type TicketRow } from "@/lib/queries/projects";
import { TicketCreateForm, TicketCard, DeleteProjectButton } from "@/components/projects/projects-client";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        icon={ClipboardList}
        title={project.name}
        subtitle={project.description ?? "Project board"}
        actions={
          <>
            <TicketCreateForm projectId={project.id} />
            {canManage && <DeleteProjectButton id={project.id} />}
          </>
        }
      />

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
