import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import {
  listContracts,
  CONTRACT_TYPES,
  CONTRACT_STATUSES,
  type ContractTypeValue,
  type ContractStatusValue,
} from "@/lib/queries/contracts";
import { ContractCreateForm, ContractActions } from "@/components/contracts/contracts-client";
import { MfdPanel, MfdReadout } from "@/components/ui/mfd";

const STATUS_CLS: Record<string, string> = {
  OPEN: "border-green-800 bg-green-950 text-green-300",
  CLAIMED: "border-info bg-surface-elevated text-info",
  COMPLETED: "border-border-light bg-surface text-text-secondary",
  CANCELLED: "border-border bg-surface text-text-muted",
};

const TYPE_CLS: Record<ContractTypeValue, string> = {
  GENERAL:   "border-border bg-surface text-text-muted",
  ESCORT:    "border-amber-700 bg-amber-950 text-amber-300",
  MINING:    "border-yellow-700 bg-yellow-950 text-yellow-300",
  COMBAT:    "border-danger bg-danger text-fg-red-light",
  SALVAGE:   "border-orange-700 bg-orange-950 text-orange-300",
  TRANSPORT: "border-blue-700 bg-blue-950 text-blue-300",
  BOUNTY:    "border-danger bg-danger text-fg-red-light",
  RECON:     "border-cyan-700 bg-cyan-950 text-cyan-300",
  MEDICAL:   "border-green-700 bg-green-950 text-green-300",
  TRADE:     "border-violet-700 bg-violet-950 text-violet-300",
};

function expiryLabel(expiresAt: Date | null): string | null {
  if (!expiresAt) return null;
  const now = Date.now();
  const diff = expiresAt.getTime() - now;
  if (diff <= 0) return "expired";
  const days = Math.floor(diff / 86_400_000);
  if (days > 0) return `expires in ${days}d`;
  const hours = Math.floor(diff / 3_600_000);
  return `expires in ${hours}h`;
}

function buildHref(
  base: string,
  typeParam: string | undefined,
  statusParam: string | undefined,
): string {
  const parts: string[] = [];
  if (typeParam) parts.push(`type=${typeParam}`);
  if (statusParam) parts.push(`status=${statusParam}`);
  return parts.length ? `${base}?${parts.join("&")}` : base;
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const canManage = hasTier(viewer.tier, "OFFICER");

  const rawType = params.type?.toUpperCase();
  const rawStatus = params.status?.toUpperCase();
  const typeFilter = (CONTRACT_TYPES as readonly string[]).includes(rawType ?? "")
    ? (rawType as ContractTypeValue)
    : undefined;
  const statusFilter = (CONTRACT_STATUSES as readonly string[]).includes(rawStatus ?? "")
    ? (rawStatus as ContractStatusValue)
    : undefined;

  const contracts = await listContracts(makeTenantContext(ctx.tenant.id), {
    type: typeFilter,
    status: statusFilter,
  });

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={FileText} title="Contracts" subtitle="Available missions and posted jobs" />

      {/* Create form */}
      {canManage && (
        <MfdPanel chassis="primary" title={<span>[ NEW CONTRACT ]</span>} bodyPadding="md">
          <ContractCreateForm />
        </MfdPanel>
      )}

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", ...CONTRACT_TYPES] as const).map((tab) => {
          const isActive = tab === "ALL" ? !typeFilter : typeFilter === tab;
          const href = buildHref(
            "/contracts",
            tab === "ALL" ? undefined : tab,
            statusFilter,
          );
          return (
            <a
              key={tab}
              href={href}
              className={`rounded border px-2.5 py-1 text-xs font-medium uppercase tracking-wide transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab === "ALL" ? "All Types" : tab}
            </a>
          );
        })}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", ...CONTRACT_STATUSES] as const).map((tab) => {
          const isActive = tab === "ALL" ? !statusFilter : statusFilter === tab;
          const href = buildHref(
            "/contracts",
            typeFilter,
            tab === "ALL" ? undefined : tab,
          );
          return (
            <a
              key={tab}
              href={href}
              className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border border-primary bg-surface-elevated text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab === "ALL" ? "All Status" : tab}
            </a>
          );
        })}
      </div>

      {/* Contract list */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ CONTRACTS ]</span>}
        titleAside={<span>{contracts.length} total</span>}
        bodyPadding="sm"
      >
        {contracts.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">No contracts match your filters.</p>
        ) : (
          <ul className="space-y-3 py-1">
            {contracts.map((c) => {
              const expiry = expiryLabel(c.expiresAt);
              return (
                <li key={c.id} className="rounded border border-border bg-surface-elevated p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Type badge */}
                        <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase ${TYPE_CLS[c.type] ?? TYPE_CLS.GENERAL}`}>
                          {c.type}
                        </span>
                        {/* Status badge */}
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
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        {c.createdByName && (
                          <span>
                            <span className="mfd-label">POSTED BY</span>{" "}
                            {c.createdByUsername ? (
                              <a href={`/members/${c.createdByUsername}`} className="text-text-secondary hover:text-text-primary hover:underline">
                                {c.createdByName}
                              </a>
                            ) : (
                              <span className="text-text-secondary">{c.createdByName}</span>
                            )}
                          </span>
                        )}
                        {c.claimedByName && (
                          <span>
                            <span className="mfd-label">CLAIMED BY</span>{" "}
                            {c.claimedByUsername ? (
                              <a href={`/members/${c.claimedByUsername}`} className="text-text-secondary hover:text-text-primary hover:underline">
                                {c.claimedByName}
                              </a>
                            ) : (
                              <span className="text-text-secondary">{c.claimedByName}</span>
                            )}
                          </span>
                        )}
                        {expiry && (
                          <span className={expiry === "expired" ? "text-fg-red-light" : "text-text-muted"}>
                            {expiry}
                          </span>
                        )}
                      </div>
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
              );
            })}
          </ul>
        )}
      </MfdPanel>
    </div>
  );
}
