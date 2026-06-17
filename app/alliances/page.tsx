import { notFound } from "next/navigation";
import { Handshake } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listAlliances } from "@/lib/queries/alliances";
import { AllianceCreateForm, DeleteAllianceButton } from "@/components/alliances/alliances-client";
import { MfdPanel } from "@/components/ui/mfd";

const STATUS_CLS: Record<string, string> = {
  ALLY: "border-green-800 bg-green-950 text-green-300",
  NEUTRAL: "border-border bg-surface text-text-secondary",
  HOSTILE: "border-danger bg-surface text-fg-red-light",
  PENDING: "border-amber bg-primary/10 text-amber",
};

export default async function AlliancesPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const alliances = await listAlliances(makeTenantContext(ctx.tenant.id));

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={Handshake} title="Alliances" subtitle="Org diplomacy and inter-faction relations" />

      {/* Create form */}
      {canManage && (
        <MfdPanel chassis="primary" title={<span>[ ADD ALLIANCE ]</span>} bodyPadding="md">
          <AllianceCreateForm />
        </MfdPanel>
      )}

      {/* Alliance list */}
      <MfdPanel
        title={<span>[ ALLIANCES ]</span>}
        titleAside={<span className="mfd-readout">{alliances.length}</span>}
        bodyPadding="sm"
      >
        {alliances.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">No alliances recorded yet.</p>
        ) : (
          <ul className="space-y-2 py-1">
            {alliances.map((a) => (
              <li key={a.id} className="rounded border border-border bg-surface-elevated p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase ${STATUS_CLS[a.status] ?? STATUS_CLS.NEUTRAL}`}>
                        {a.status}
                      </span>
                      {a.link ? (
                        <a
                          href={a.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-text-primary underline hover:text-primary"
                        >
                          {a.name}
                        </a>
                      ) : (
                        <span className="font-medium text-text-primary">{a.name}</span>
                      )}
                    </div>
                    {a.description && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{a.description}</p>
                    )}
                  </div>
                  {canManage && <DeleteAllianceButton id={a.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </MfdPanel>
    </div>
  );
}
