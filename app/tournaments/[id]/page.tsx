import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getTournamentWithEntries } from "@/lib/queries/tournaments";
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
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <a
          href="/tournaments"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          &larr; Tournaments
        </a>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            <span className={statusClass}>{statusLabel}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
            {tournament.format && <span>{tournament.format}</span>}
            {tournament.startsAt && (
              <span>
                {new Date(tournament.startsAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
          {tournament.description && (
            <p className="mt-3 max-w-prose text-sm text-text-secondary whitespace-pre-wrap">
              {tournament.description}
            </p>
          )}
        </div>
        {isCommand && (
          <DeleteTournamentButton tournamentId={tournament.id} />
        )}
      </div>

      {canRegister && (
        <div className="mb-6">
          <RegisterButton tournamentId={tournament.id} />
        </div>
      )}

      <h2 className="mb-3 font-semibold">
        Entries{" "}
        <span className="text-text-muted font-normal text-sm">
          ({tournament.entries.length})
        </span>
      </h2>

      {tournament.entries.length === 0 ? (
        <p className="mb-8 text-sm text-text-secondary">No entries yet.</p>
      ) : (
        <div className="mb-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="pb-2 pr-4 font-normal">Place</th>
                <th className="pb-2 pr-4 font-normal">Name</th>
                <th className="pb-2 font-normal">Seed</th>
              </tr>
            </thead>
            <tbody>
              {tournament.entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border hover:bg-surface-hover/40">
                  <td className="py-2 pr-4 font-mono text-text-secondary">
                    {entry.placement != null ? (
                      entry.placement
                    ) : (
                      <span className="text-text-muted">&mdash;</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="font-medium">{entry.displayName}</span>
                    {entry.participantMembershipId === viewer.id && (
                      <span className="ml-2 rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-text-secondary">
                        you
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-text-secondary">
                    {entry.seed != null ? (
                      entry.seed
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

      {isOfficer && (
        <div className="mt-6">
          <h2 className="mb-4 font-semibold">Manage</h2>
          <ManageTournament
            tournamentId={tournament.id}
            currentStatus={tournament.status}
            entries={tournament.entries}
          />
        </div>
      )}
    </main>
  );
}
