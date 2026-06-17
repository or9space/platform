import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listProjects } from "@/lib/queries/projects";
import { ProjectCreateForm } from "@/components/projects/projects-client";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
import { ClipboardList } from "lucide-react";

export default async function ProjectsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const canManage = hasTier(viewer.tier, "OFFICER");

  const projects = await listProjects(makeTenantContext(ctx.tenant.id));

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Projects"
        readout={<>{projects.length} active boards</>}
      />

      {/* Create panel */}
      {canManage && (
        <MfdPanel chassis="primary" title={<span>[ NEW BOARD ]</span>} bodyPadding="md">
          <ProjectCreateForm />
        </MfdPanel>
      )}

      {/* Projects list panel */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ PROJECTS ]</span>}
        titleAside={<span className="mfd-readout text-xs">{projects.length}</span>}
        bodyPadding={projects.length === 0 ? "md" : "none"}
      >
        {projects.length === 0 ? (
          <p className="mfd-label text-center py-8">NO BOARDS ON RECORD</p>
        ) : (
          <ul className="grid sm:grid-cols-2">
            {projects.map((p, idx) => (
              <li key={p.id} className={idx !== 0 ? "border-t border-border/40 sm:border-t-0 sm:[&:nth-child(n+3)]:border-t sm:[&:nth-child(even)]:border-l border-border/40" : ""}>
                <a
                  href={`/projects/${p.id}`}
                  className="group flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-primary/5"
                >
                  <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-text-secondary">{p.description}</p>
                  )}
                  <p className="mfd-label mt-0.5">
                    <span className="mfd-readout text-xs">{p.doneCount}</span>
                    <span className="mx-1">/</span>
                    <span className="mfd-readout text-xs">{p.ticketCount}</span>
                    <span className="ml-1">done</span>
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </MfdPanel>
    </div>
  );
}
