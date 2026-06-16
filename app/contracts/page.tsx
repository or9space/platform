import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listContracts } from "@/lib/queries/contracts";
import { ContractCreateForm, ContractActions } from "@/components/contracts/contracts-client";

const STATUS_CLS: Record<string, string> = {
  OPEN: "border-green-800 bg-green-950 text-green-300",
  CLAIMED: "border-sky-800 bg-sky-950 text-info",
  COMPLETED: "border-border-light bg-surface text-text-secondary",
  CANCELLED: "border-border bg-surface text-text-muted",
};

export default async function ContractsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const canManage = hasTier(viewer.tier, "OFFICER");

  const contracts = await listContracts(makeTenantContext(ctx.tenant.id));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Contracts</h1>
      {canManage && <ContractCreateForm />}

      {contracts.length === 0 ? (
        <p className="text-sm text-text-muted">No contracts yet.</p>
      ) : (
        <ul className="space-y-3">
          {contracts.map((c) => (
            <li key={c.id} className="rounded border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase ${STATUS_CLS[c.status] ?? STATUS_CLS.OPEN}`}>{c.status}</span>
                    <p className="font-medium text-text-primary">{c.title}</p>
                  </div>
                  {c.reward && <p className="mt-1 text-sm text-amber">Reward: {c.reward}</p>}
                  {c.description && <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{c.description}</p>}
                  {c.claimedByName && (
                    <p className="mt-1 text-xs text-text-muted">
                      Claimed by <a href={`/members/${c.claimedByUsername}`} className="hover:underline">{c.claimedByName}</a>
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <ContractActions
                  id={c.id}
                  status={c.status}
                  canManage={canManage}
                  isClaimant={c.claimedById === viewer.id}
                  canClaim={true}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
