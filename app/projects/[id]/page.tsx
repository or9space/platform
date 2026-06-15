import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getProject, TICKET_STATUSES, type TicketRow } from "@/lib/queries/projects";
import { TicketCreateForm, TicketCard, DeleteProjectButton } from "@/components/projects/projects-client";

const COLUMN_LABEL: Record<string, string> = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done" };

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
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <a href="/projects" className="text-sm text-neutral-400 underline hover:text-neutral-100">← Projects</a>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && <p className="text-sm text-neutral-400">{project.description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <TicketCreateForm projectId={project.id} />
            {canManage && <DeleteProjectButton id={project.id} />}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TICKET_STATUSES.map((status) => (
          <section key={status}>
            <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-neutral-500">
              {COLUMN_LABEL[status]} · {byStatus.get(status)!.length}
            </h2>
            <div className="space-y-2">
              {byStatus.get(status)!.length === 0 ? (
                <p className="text-xs text-neutral-600">—</p>
              ) : (
                byStatus.get(status)!.map((t) => (
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
          </section>
        ))}
      </div>
    </main>
  );
}
