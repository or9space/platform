import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
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
import { MfdPanel } from "@/components/ui/mfd";
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
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sessions</h1>
          <p className="text-sm text-text-muted">
            <a href="/loot" className="hover:text-text-primary">Leaderboard</a>
            <span className="mx-1.5 text-text-muted">/</span>
            Loot sessions
          </p>
        </div>
      </div>

      {/* Create session form */}
      <MfdPanel chassis="primary" title="[ NEW SESSION ]" bodyPadding="md">
        <CreateSessionForm />
      </MfdPanel>

      {/* Sessions list */}
      <MfdPanel
        chassis="neutral"
        title="[ SESSIONS ]"
        titleAside={<span className="mfd-readout">{sessions.length} total</span>}
        bodyPadding="none"
      >
        {sessions.length === 0 ? (
          <p className="px-4 py-3 text-text-secondary text-sm">No sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 pb-2 pt-3 font-normal mfd-label">Date</th>
                  <th className="pb-2 pt-3 pr-4 font-normal mfd-label">Label</th>
                  <th className="pb-2 pt-3 pr-4 font-normal mfd-label">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-b border-border hover:bg-surface-hover/40 ${
                      selectedSessionId === s.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <td className="py-2 pl-4 pr-4 text-text-secondary">
                      <span className="mfd-readout">{s.sessionDate.toISOString().slice(0, 10)}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <a
                        href={`/loot/sessions?session=${s.id}`}
                        className={`font-medium hover:text-primary ${selectedSessionId === s.id ? "text-primary" : "text-text-primary"}`}
                      >
                        {s.label}
                      </a>
                    </td>
                    <td className="py-2 pr-4 text-text-secondary max-w-xs truncate">
                      {s.notes ?? <span className="text-text-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MfdPanel>

      {/* Attendance grid for selected session */}
      {grid && (
        <MfdPanel
          chassis="amber"
          title="[ ATTENDANCE ]"
          titleAside={
            <span className="mfd-readout">
              {grid.sessionDate.toISOString().slice(0, 10)}
              {grid.notes && <span className="ml-2 text-text-secondary">{grid.notes}</span>}
            </span>
          }
          bodyPadding="none"
        >
          <div className="px-4 py-2">
            <p className="mfd-label mb-2">{grid.label}</p>
          </div>
          {members.length === 0 ? (
            <p className="px-4 py-3 text-text-muted text-sm">No loot participants.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 pb-2 pt-1 font-normal mfd-label">Member</th>
                    <th className="pb-2 pt-1 pr-4 font-normal mfd-label">Attendance</th>
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
                        <td className="py-2 pl-4 pr-4 text-text-primary font-medium">
                          {m.displayName}
                        </td>
                        <td className="py-2 pr-4">
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
        </MfdPanel>
      )}
    </div>
  );
}
