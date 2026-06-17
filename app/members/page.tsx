import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listMembers } from "@/lib/queries/members";
import type { MemberRow } from "@/lib/queries/members";
import type { RankTier } from "@/lib/permissions";
import { Rank } from "@/components/rank";
import { L } from "@/components/l";
import { MfdPanel } from "@/components/ui/mfd";
import { Users, Shield } from "lucide-react";

const tierChassis: Record<RankTier, "primary" | "amber" | "neutral"> = {
  COMMAND: "primary",
  OFFICER: "amber",
  NCO: "neutral",
  ENLISTED: "neutral",
};

function AvatarBlock({ member }: { member: MemberRow }) {
  if (member.avatarUrl && member.avatarUrl.startsWith("http")) {
    return (
      <img
        src={member.avatarUrl}
        alt={member.displayName ?? member.username}
        className="h-10 w-10 shrink-0 border border-border-light object-cover mfd-cut-tl-br"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border-light bg-surface-elevated text-sm font-semibold uppercase text-text-secondary mfd-cut-tl-br">
      {(member.displayName ?? member.username).slice(0, 1)}
    </div>
  );
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string; view?: string }>;
}) {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);

  const { q, tier, view } = await searchParams;
  const ctx = makeTenantContext(tenant.id);
  const allMembers = await listMembers(ctx, q);

  const canManageRanks = viewer ? hasTier(viewer.tier, "COMMAND") : false;

  // Tier filter
  const filtered: MemberRow[] =
    tier && (["ENLISTED", "NCO", "OFFICER", "COMMAND"] as RankTier[]).includes(tier as RankTier)
      ? allMembers.filter((m) => m.tier === tier)
      : allMembers;

  const isGridView = view === "grid";

  // Group by tier for list view
  const groups: { tier: RankTier; members: MemberRow[] }[] = (
    ["COMMAND", "OFFICER", "NCO", "ENLISTED"] as RankTier[]
  )
    .map((t) => ({ tier: t, members: filtered.filter((m) => m.tier === t) }))
    .filter((g) => g.members.length > 0);

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
              <span className="mfd-readout">{filtered.length}</span>
              <span className="ml-1.5">personnel on record</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <a
            href={`/members?${new URLSearchParams({ ...(q ? { q } : {}), ...(tier ? { tier } : {}), view: isGridView ? "list" : "grid" }).toString()}`}
            className="mfd-label border border-border-light bg-surface-elevated px-3 py-1.5 text-xs hover:border-primary hover:text-primary transition-colors"
          >
            [ {isGridView ? "LIST" : "GRID"} ]
          </a>
          {canManageRanks && (
            <a
              href="/admin/members"
              className="mfd-label border border-border-light bg-surface-elevated px-3 py-1.5 text-xs hover:border-primary hover:text-primary transition-colors"
            >
              [ MANAGE RANKS ]
            </a>
          )}
        </div>
      </div>

      {/* Search + filter panel */}
      <MfdPanel chassis="neutral" title={<span>[ SEARCH / FILTER ]</span>} bodyPadding="sm">
        <form method="GET">
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search members…"
              className="flex-1 min-w-[160px] border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <select
              name="tier"
              defaultValue={tier ?? ""}
              className="border border-border-light bg-surface px-3 py-2 text-sm text-text-secondary focus:border-primary focus:outline-none"
            >
              <option value="">ALL TIERS</option>
              <option value="COMMAND">COMMAND</option>
              <option value="OFFICER">OFFICER</option>
              <option value="NCO">NCO</option>
              <option value="ENLISTED">ENLISTED</option>
            </select>
            {view && <input type="hidden" name="view" value={view} />}
            <button
              type="submit"
              className="border border-border-light bg-surface-elevated px-4 py-2 text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors"
            >
              SCAN
            </button>
          </div>
        </form>
      </MfdPanel>

      {/* Roster */}
      {filtered.length === 0 ? (
        <MfdPanel chassis="neutral" title={<span>[ ROSTER ]</span>} bodyPadding="md">
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Users className="mb-3 h-10 w-10 opacity-40" />
            <p className="mfd-label">NO PERSONNEL FOUND</p>
            <p className="text-xs text-text-muted mt-1">Try adjusting your search or filters</p>
          </div>
        </MfdPanel>
      ) : isGridView ? (
        /* ---- GRID VIEW ---- */
        <MfdPanel
          chassis="neutral"
          title={<span>[ ROSTER ]</span>}
          titleAside={<span className="mfd-readout text-xs">{filtered.length}</span>}
          bodyPadding="sm"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((m) => (
              <a
                key={m.id}
                href={`/members/${m.username}`}
                className="group flex flex-col gap-3 border border-border bg-surface p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start gap-3">
                  <AvatarBlock member={m} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                      {m.displayName ?? m.username}
                    </p>
                    <p className="mfd-label mt-0.5">@{m.username}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      <Rank tier={m.tier} />
                    </p>
                  </div>
                </div>
                <div className="border-t border-border/40 pt-2">
                  <p className="mfd-label">
                    {m.createdAt.toISOString().slice(0, 7)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </MfdPanel>
      ) : (
        /* ---- LIST VIEW (grouped by tier) ---- */
        <div className="space-y-4">
          {groups.map(({ tier: groupTier, members }) => (
            <MfdPanel
              key={groupTier}
              chassis={tierChassis[groupTier]}
              title={
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  <span>[ <Rank tier={groupTier} /> ]</span>
                </span>
              }
              titleAside={<span className="mfd-readout text-xs">{members.length}</span>}
              bodyPadding="none"
            >
              <ul>
                {members.map((m, idx) => (
                  <li key={m.id} className={idx !== 0 ? "border-t border-border/40" : ""}>
                    <a
                      href={`/members/${m.username}`}
                      className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-primary/5"
                    >
                      {/* Avatar with mfd-cut clip */}
                      <AvatarBlock member={m} />

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
            </MfdPanel>
          ))}
        </div>
      )}
    </div>
  );
}
