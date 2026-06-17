import { notFound } from "next/navigation";
import { BookOpen, Link2, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listResources } from "@/lib/queries/resources";
import { MfdPanel } from "@/components/ui/mfd";
import { ResourceCreateForm, DeleteResourceButton } from "@/components/resources/resources-client";

export default async function ResourcesPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const resources = await listResources(makeTenantContext(ctx.tenant.id));

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={BookOpen} title="Resources" subtitle="Guides, builds, and reference links." />

      {canManage && <ResourceCreateForm />}

      <MfdPanel
        chassis="neutral"
        bodyPadding="none"
        title={<><BookOpen className="h-3 w-3 text-primary" /><span>[ RESOURCES ]</span></>}
        titleAside={<span className="mfd-readout text-[10px]">{resources.length}</span>}
      >
        {resources.length === 0 ? (
          <p className="px-4 py-3 text-sm text-text-muted">No resources yet.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {resources.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-surface-hover/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.category && (
                      <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 mfd-label text-[10px] uppercase text-text-secondary">
                        {r.category}
                      </span>
                    )}
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-primary underline underline-offset-2"
                      >
                        <Link2 className="h-3 w-3 shrink-0 text-primary" />
                        {r.title}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-text-primary">
                        <FileText className="h-3 w-3 shrink-0 text-text-muted" />
                        {r.title}
                      </span>
                    )}
                  </div>
                  {r.body && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{r.body}</p>
                  )}
                  <p className="mt-1 mfd-label text-[10px]">
                    Added by <span className="text-text-secondary">{r.authorName}</span>
                  </p>
                </div>
                {canManage && (
                  <div className="shrink-0 pt-0.5">
                    <DeleteResourceButton id={r.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </MfdPanel>
    </div>
  );
}
