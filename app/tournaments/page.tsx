import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listTournaments } from "@/lib/queries/tournaments";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
import { CreateTournamentForm } from "./create-tournament-form";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
};

const STATUS_CLASSES: Record<string, string> = {
  DRAFT: "rounded px-1.5 py-0.5 text-xs font-semibold bg-surface-elevated text-text-secondary",
  OPEN: "rounded px-1.5 py-0.5 text-xs font-semibold bg-green-900/50 text-green-300",
  IN_PROGRESS: "rounded px-1.5 py-0.5 text-xs font-semibold bg-yellow-900/50 text-yellow-300",
  COMPLETE: "rounded px-1.5 py-0.5 text-xs font-semibold bg-blue-900/50 text-blue-300",
};

export default async function TournamentsPage() {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  if (!viewer) notFound();

  const ctx = makeTenantContext(tenant.id);
  const tournaments = await listTournaments(ctx);

  const isOfficer = hasTier(viewer.tier, "OFFICER");

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={Trophy} title="Tournaments" subtitle="Competitive events and bracket play." />

      <MfdPanel
        chassis="neutral"
        bodyPadding="sm"
        title={<span>[ TOURNAMENTS ]</span>}
        titleAside={<span className="mfd-readout text-[10px]">{tournaments.length}</span>}
      >
        {tournaments.length === 0 ? (
          <p className="px-1 py-2 text-sm text-text-muted">No tournaments yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tournaments.map((t) => {
              const statusLabel = STATUS_LABELS[t.status] ?? t.status;
              const statusClass = STATUS_CLASSES[t.status] ?? STATUS_CLASSES.DRAFT;
              return (
                <a
                  key={t.id}
                  href={`/tournaments/${t.id}`}
                  className="block border border-border bg-surface-elevated p-4 hover:border-primary hover:bg-surface-hover/40 transition-colors mfd-cut-tl-br"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="font-semibold text-text-primary">{t.name}</span>
                    <span className={statusClass}>{statusLabel}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {t.format && <span className="text-text-secondary">{t.format}</span>}
                    {t.startsAt && (
                      <span className="text-text-secondary">
                        {new Date(t.startsAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    <span className="mfd-readout text-xs">
                      {t.entryCount} {t.entryCount === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </MfdPanel>

      {isOfficer && (
        <MfdPanel chassis="primary" bodyPadding="md" title={<span>[ CREATE TOURNAMENT ]</span>}>
          <CreateTournamentForm />
        </MfdPanel>
      )}
    </div>
  );
}
