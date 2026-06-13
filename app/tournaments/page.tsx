import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listTournaments } from "@/lib/queries/tournaments";
import { CreateTournamentForm } from "./create-tournament-form";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
};

const STATUS_CLASSES: Record<string, string> = {
  DRAFT: "rounded px-1.5 py-0.5 text-xs font-semibold bg-neutral-800 text-neutral-400",
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
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <p className="text-sm text-neutral-400">
          {tournaments.length} {tournaments.length === 1 ? "tournament" : "tournaments"}
        </p>
      </div>

      {tournaments.length === 0 ? (
        <p className="mb-8 text-neutral-400">No tournaments yet.</p>
      ) : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {tournaments.map((t) => {
            const statusLabel = STATUS_LABELS[t.status] ?? t.status;
            const statusClass = STATUS_CLASSES[t.status] ?? STATUS_CLASSES.DRAFT;
            return (
              <a
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="block rounded border border-neutral-800 p-4 hover:border-neutral-700 hover:bg-neutral-900/40 transition-colors"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="font-semibold">{t.name}</span>
                  <span className={statusClass}>{statusLabel}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-400">
                  {t.format && <span>{t.format}</span>}
                  {t.startsAt && (
                    <span>
                      {new Date(t.startsAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  <span>
                    {t.entryCount} {t.entryCount === 1 ? "entry" : "entries"}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {isOfficer && <CreateTournamentForm />}
    </main>
  );
}
