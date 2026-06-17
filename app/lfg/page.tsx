import { notFound } from "next/navigation";
import { UserPlus2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listLfg } from "@/lib/queries/lfg";
import { formatDate } from "@/lib/format";
import { LfgCreateForm, LfgRowActions } from "@/components/lfg/lfg-client";
import { MfdPanel } from "@/components/ui/mfd";

export default async function LfgPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const isOfficer = hasTier(viewer.tier, "OFFICER");

  const posts = await listLfg(makeTenantContext(ctx.tenant.id));

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={UserPlus2} title="LFG" subtitle="Find crew and wing partners" />

      {/* Create form */}
      <LfgCreateForm />

      {/* Posts */}
      {posts.length === 0 ? (
        <MfdPanel title={<span>[ LFG ]</span>} bodyPadding="md">
          <p className="mfd-label py-4 text-center">No posts yet.</p>
        </MfdPanel>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const canManage = isOfficer || p.authorId === viewer.id;
            return (
              <MfdPanel
                key={p.id}
                chassis={p.status === "CLOSED" ? "neutral" : "primary"}
                bodyPadding="md"
                className={p.status === "CLOSED" ? "opacity-60" : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {p.status === "CLOSED" && (
                        <span className="mfd-label text-xs uppercase">Closed</span>
                      )}
                      <p className="font-medium text-text-primary">{p.title}</p>
                    </div>
                    {p.body && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{p.body}</p>
                    )}
                    <p className="mt-1 text-xs text-text-muted">
                      <a href={`/members/${p.authorUsername}`} className="hover:underline text-primary">{p.authorName}</a>
                      {" · "}
                      <span className="mfd-readout text-xs">{formatDate(p.createdAt)}</span>
                    </p>
                  </div>
                  {canManage && <LfgRowActions id={p.id} status={p.status} />}
                </div>
              </MfdPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
