import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listContracts } from "@/lib/queries/contracts";
import { ContractCreateForm, ContractActions } from "@/components/contracts/contracts-client";
import { MfdPanel, MfdReadout } from "@/components/ui/mfd";

const STATUS_CLS: Record<string, string> = {
  OPEN: "border-green-800 bg-green-950 text-green-300",
  CLAIMED: "border-info bg-surface-elevated text-info",
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
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={FileText} title="Contracts" subtitle="Available missions and posted jobs" />

      {/* Create form */}
      {canManage && (
        <MfdPanel chassis="primary" title={<span>[ NEW CONTRACT ]</span>} bodyPadding="md">
          <ContractCreateForm />
        </MfdPanel>
      )}

      {/* Contract list */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ CONTRACTS ]</span>}
        titleAside={<span>{contracts.length} total</span>}
        bodyPadding="sm"
      >
        {contracts.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">No contracts posted yet.</p>
        ) : (
          <ul className="space-y-3 py-1">
            {contracts.map((c) => (
              <li key={c.id} className="rounded border border-border bg-surface-elevated p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase ${STATUS_CLS[c.status] ?? STATUS_CLS.OPEN}`}>
                        {c.status}
                      </span>
                      <p className="font-medium text-text-primary">{c.title}</p>
                    </div>
                    {c.reward && (
                      <div className="mt-2">
                        <MfdReadout label="REWARD" value={c.reward} tone="amber" size="sm" />
                      </div>
                    )}
                    {c.description && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{c.description}</p>
                    )}
                    {c.claimedByName && (
                      <p className="mt-1 text-xs text-text-muted">
                        <span className="mfd-label">CLAIMED BY</span>{" "}
                        <a href={`/members/${c.claimedByUsername}`} className="text-text-secondary hover:text-text-primary hover:underline">
                          {c.claimedByName}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 border-t border-border/40 pt-3">
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
      </MfdPanel>
    </div>
  );
}
