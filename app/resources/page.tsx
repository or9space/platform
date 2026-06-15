import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listResources } from "@/lib/queries/resources";
import { ResourceCreateForm, DeleteResourceButton } from "@/components/resources/resources-client";

export default async function ResourcesPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const resources = await listResources(makeTenantContext(ctx.tenant.id));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resources</h1>
      </div>
      {canManage && <ResourceCreateForm />}

      {resources.length === 0 ? (
        <p className="text-sm text-neutral-500">No resources yet.</p>
      ) : (
        <ul className="space-y-3">
          {resources.map((r) => (
            <li key={r.id} className="rounded border border-neutral-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {r.category && <span className="mr-2 rounded border border-neutral-700 px-2 py-0.5 text-xs uppercase text-neutral-400">{r.category}</span>}
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-neutral-100 underline hover:text-white">{r.title}</a>
                  ) : (
                    <span className="font-medium text-neutral-100">{r.title}</span>
                  )}
                  {r.body && <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-400">{r.body}</p>}
                  <p className="mt-1 text-xs text-neutral-600">Added by {r.authorName}</p>
                </div>
                {canManage && <DeleteResourceButton id={r.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
