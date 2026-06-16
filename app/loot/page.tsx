import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listLootMembersWithBalances } from "@/lib/queries/loot";
import { formatPoints } from "@/lib/loot";
import { AddParticipantForm } from "./add-participant-form";

export default async function LootPage() {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);

  const ctx = makeTenantContext(tenant.id);
  const members = await listLootMembersWithBalances(ctx);

  const isOfficer = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loot Leaderboard</h1>
        {isOfficer && (
          <a
            href="/loot/sessions"
            className="rounded border border-border-light px-4 py-2 text-sm hover:border-primary"
          >
            Sessions
          </a>
        )}
      </div>

      {isOfficer && (
        <div className="mb-6">
          <AddParticipantForm />
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-text-secondary">No loot participants yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="pb-2 pr-4 font-normal w-12">#</th>
                <th className="pb-2 pr-4 font-normal">Name</th>
                <th className="pb-2 font-normal text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr
                  key={m.id}
                  className="border-b border-border hover:bg-surface-hover/40"
                >
                  <td className="py-2 pr-4 text-text-muted">{i + 1}</td>
                  <td className="py-2 pr-4">
                    <a
                      href={`/loot/${m.id}`}
                      className="hover:text-text-secondary text-text-primary"
                    >
                      {m.displayName}
                    </a>
                  </td>
                  <td className="py-2 font-mono text-right">
                    <span className={m.balanceTenths < 0 ? "text-fg-red-light" : "text-text-primary"}>
                      {formatPoints(m.balanceTenths)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
