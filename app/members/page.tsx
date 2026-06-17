import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listMembers } from "@/lib/queries/members";
import { Rank } from "@/components/rank";
import { L } from "@/components/l";
import { MfdPanel } from "@/components/ui/mfd";
import { Users } from "lucide-react";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);

  const { q } = await searchParams;
  const ctx = makeTenantContext(tenant.id);
  const members = await listMembers(ctx, q);

  const canManageRanks = viewer ? hasTier(viewer.tier, "COMMAND") : false;

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              <L k="memberPlural" fallback="Members" />
            </h1>
            <p className="text-sm text-text-muted">
              <span className="mfd-readout">{members.length}</span>
              <span className="ml-1.5">personnel on record</span>
            </p>
          </div>
        </div>
        {canManageRanks && (
          <a
            href="/admin/members"
            className="mfd-label border border-border-light bg-surface-elevated px-3 py-1.5 text-xs hover:border-primary hover:text-primary transition-colors"
          >
            [ MANAGE RANKS ]
          </a>
        )}
      </div>

      {/* Search panel */}
      <MfdPanel chassis="neutral" title={<span>[ SEARCH ]</span>} bodyPadding="sm">
        <form method="GET">
          <div className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search members…"
              className="flex-1 border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="border border-border-light bg-surface-elevated px-4 py-2 text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors"
            >
              SCAN
            </button>
          </div>
        </form>
      </MfdPanel>

      {/* Roster panel */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ ROSTER ]</span>}
        titleAside={
          <span className="mfd-readout text-xs">{members.length}</span>
        }
        bodyPadding="none"
      >
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Users className="mb-3 h-10 w-10 opacity-40" />
            <p className="mfd-label">NO PERSONNEL FOUND</p>
          </div>
        ) : (
          <ul>
            {members.map((m, idx) => (
              <li key={m.id} className={idx !== 0 ? "border-t border-border/40" : ""}>
                <a
                  href={`/members/${m.username}`}
                  className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-primary/5"
                >
                  {/* Avatar */}
                  <div className="shrink-0">
                    {m.avatarUrl && m.avatarUrl.startsWith("http") ? (
                      <img
                        src={m.avatarUrl}
                        alt={m.displayName ?? m.username}
                        className="h-9 w-9 object-cover border border-border-light"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center border border-border-light bg-surface-elevated text-sm font-semibold uppercase text-text-secondary mfd-cut-tl-br">
                        {(m.displayName ?? m.username).slice(0, 1)}
                      </div>
                    )}
                  </div>

                  {/* Name + handle */}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                      {m.displayName ?? m.username}
                    </p>
                    <p className="mfd-label mt-0.5">@{m.username}</p>
                  </div>

                  {/* Rank + join date */}
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-text-secondary">
                      <Rank tier={m.tier} />
                    </p>
                    <p className="mfd-label mt-0.5">
                      {m.createdAt.toISOString().slice(0, 10)}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </MfdPanel>
    </div>
  );
}
