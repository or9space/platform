import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import {
  listSessions,
  getSessionWithGrid,
  listLootMembersWithBalances,
} from "@/lib/queries/loot";
import { ATTENDANCE_STATUSES } from "@/lib/loot";
import { CreateSessionForm } from "./create-session-form";
import { AttendanceCell } from "./attendance-cell";

export default async function LootSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);

  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  const { session: selectedSessionId } = await searchParams;

  const ctx = makeTenantContext(tenant.id);
  const [sessions, members] = await Promise.all([
    listSessions(ctx),
    listLootMembersWithBalances(ctx),
  ]);

  const grid =
    selectedSessionId
      ? await getSessionWithGrid(ctx, selectedSessionId)
      : null;

  // Build a map of memberId->status for the selected session
  const attendanceMap = new Map<string, string>();
  if (grid) {
    for (const row of grid.rows) {
      attendanceMap.set(row.memberId, row.status);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-4 text-sm">
        <a href="/loot" className="text-text-secondary hover:text-text-primary">
          Leaderboard
        </a>
        <span className="mx-2 text-text-muted">/</span>
        <span className="text-text-secondary">Sessions</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
      </div>

      <div className="mb-6">
        <CreateSessionForm />
      </div>

      {sessions.length === 0 ? (
        <p className="text-text-secondary">No sessions yet.</p>
      ) : (
        <div className="mb-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="pb-2 pr-4 font-normal">Date</th>
                <th className="pb-2 pr-4 font-normal">Label</th>
                <th className="pb-2 font-normal">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b border-border hover:bg-surface-hover/40 ${
                    selectedSessionId === s.id ? "bg-surface/60" : ""
                  }`}
                >
                  <td className="py-2 pr-4 text-text-secondary">
                    {s.sessionDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="py-2 pr-4">
                    <a
                      href={`/loot/sessions?session=${s.id}`}
                      className="hover:text-text-secondary text-text-primary"
                    >
                      {s.label}
                    </a>
                  </td>
                  <td className="py-2 text-text-secondary max-w-xs truncate">
                    {s.notes ?? <span className="text-text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {grid && (
        <section>
          <h2 className="mb-1 font-semibold text-lg">{grid.label}</h2>
          <p className="mb-4 text-sm text-text-muted">
            {grid.sessionDate.toISOString().slice(0, 10)}
            {grid.notes && (
              <span className="ml-3 text-text-secondary">{grid.notes}</span>
            )}
          </p>

          {members.length === 0 ? (
            <p className="text-text-muted text-sm">No loot participants.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="pb-2 pr-4 font-normal">Member</th>
                    <th className="pb-2 font-normal">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const currentStatus = attendanceMap.get(m.id) ?? "";
                    const validStatus = (
                      ATTENDANCE_STATUSES as ReadonlyArray<string>
                    ).includes(currentStatus)
                      ? (currentStatus as "PRESENT" | "LATE" | "ABSENT")
                      : undefined;
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-border hover:bg-surface-hover/40"
                      >
                        <td className="py-2 pr-4 text-text-primary">
                          {m.displayName}
                        </td>
                        <td className="py-2">
                          <AttendanceCell
                            sessionId={grid.id}
                            memberId={m.id}
                            currentStatus={validStatus}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
