import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listAlliances } from "@/lib/queries/alliances";
import { AllianceCreateForm, DeleteAllianceButton } from "@/components/alliances/alliances-client";

const STATUS_CLS: Record<string, string> = {
  ALLY: "border-green-800 bg-green-950 text-green-300",
  NEUTRAL: "border-border-light bg-surface text-text-secondary",
  HOSTILE: "border-danger bg-surface text-fg-red-light",
  PENDING: "border-amber bg-amber-soft text-amber",
};

export default async function AlliancesPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const alliances = await listAlliances(makeTenantContext(ctx.tenant.id));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Alliances</h1>
      {canManage && <AllianceCreateForm />}

      {alliances.length === 0 ? (
        <p className="text-sm text-text-muted">No alliances yet.</p>
      ) : (
        <ul className="space-y-3">
          {alliances.map((a) => (
            <li key={a.id} className="rounded border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase ${STATUS_CLS[a.status] ?? STATUS_CLS.NEUTRAL}`}>{a.status}</span>
                    {a.link ? (
                      <a href={a.link} target="_blank" rel="noopener noreferrer" className="font-medium text-text-primary underline hover:text-white">{a.name}</a>
                    ) : (
                      <span className="font-medium text-text-primary">{a.name}</span>
                    )}
                  </div>
                  {a.description && <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{a.description}</p>}
                </div>
                {canManage && <DeleteAllianceButton id={a.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
