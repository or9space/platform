import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getTournamentWithEntries } from "@/lib/queries/tournaments";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
import { RegisterButton } from "./register-button";
import { ManageTournament } from "./manage-tournament";
import { DeleteTournamentButton } from "./delete-tournament-button";

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

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  if (!viewer) notFound();

  const ctx = makeTenantContext(tenant.id);
  const tournament = await getTournamentWithEntries(ctx, id);
  if (!tournament) notFound();

  const isOfficer = hasTier(viewer.tier, "OFFICER");
  const isCommand = hasTier(viewer.tier, "COMMAND");

  const isAlreadyEntered = tournament.entries.some(
    (e) => e.participantMembershipId === viewer.id,
  );
  const canRegister = tournament.status === "OPEN" && !isAlreadyEntered;

  const statusLabel = STATUS_LABELS[tournament.status] ?? tournament.status;
  const statusClass = STATUS_CLASSES[tournament.status] ?? STATUS_CLASSES.DRAFT;

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Back nav */}
      <a href="/tournaments" className="mfd-label hover:text-text-primary">
        &larr; Tournaments
      </a>

      <PageHeader
        icon={Trophy}
        title={tournament.name}
        subtitle={tournament.description ?? tournament.format ?? "Tournament details"}
        actions={
          <>
            <span className={statusClass}>{statusLabel}</span>
            {isCommand && <DeleteTournamentButton tournamentId={tournament.id} />}
          </>
        }
      />

      {canRegister && (
        <div>
          <RegisterButton tournamentId={tournament.id} />
        </div>
      )}

      <MfdPanel
        chassis="neutral"
        bodyPadding="none"
        title={<><Trophy className="h-3 w-3 text-amber" /><span>[ ENTRIES ]</span></>}
        titleAside={<span className="mfd-readout text-[10px]">{tournament.entries.length}</span>}
      >
        {tournament.entries.length === 0 ? (
          <p className="px-4 py-3 text-sm text-text-muted">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left mfd-label">
                  <th className="px-4 py-2 font-normal">Place</th>
                  <th className="px-4 py-2 font-normal">Name</th>
                  <th className="px-4 py-2 font-normal">Seed</th>
                </tr>
              </thead>
              <tbody>
                {tournament.entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-border/50 ${entry.participantMembershipId === viewer.id ? "bg-primary/10" : "hover:bg-surface-hover/40"}`}
                  >
                    <td className="px-4 py-2">
                      {entry.placement != null ? (
                        <span className="mfd-readout text-xs">{entry.placement}</span>
                      ) : (
                        <span className="text-text-muted">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-medium text-text-primary">{entry.displayName}</span>
                      {entry.participantMembershipId === viewer.id && (
                        <span className="ml-2 border border-border px-1.5 py-0.5 text-xs mfd-label">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-text-secondary">
                      {entry.seed != null ? (
                        <span className="mfd-readout text-xs">{entry.seed}</span>
                      ) : (
                        <span className="text-text-muted">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MfdPanel>

      {isOfficer && (
        <MfdPanel chassis="amber" bodyPadding="md" title={<span className="text-amber">[ MANAGE ]</span>}>
          <ManageTournament
            tournamentId={tournament.id}
            currentStatus={tournament.status}
            entries={tournament.entries}
          />
        </MfdPanel>
      )}
    </div>
  );
}
