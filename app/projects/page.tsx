import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listProjects } from "@/lib/queries/projects";
import { ProjectCreateForm } from "@/components/projects/projects-client";

export default async function ProjectsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const canManage = hasTier(viewer.tier, "OFFICER");

  const projects = await listProjects(makeTenantContext(ctx.tenant.id));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Projects</h1>
      {canManage && <ProjectCreateForm />}

      {projects.length === 0 ? (
        <p className="text-sm text-neutral-500">No boards yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <a href={`/projects/${p.id}`} className="block rounded border border-neutral-800 p-4 transition-colors hover:border-neutral-600">
                <p className="font-medium text-neutral-100">{p.name}</p>
                {p.description && <p className="mt-1 text-sm text-neutral-400">{p.description}</p>}
                <p className="mt-2 font-mono text-xs text-neutral-500">{p.doneCount}/{p.ticketCount} done</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
