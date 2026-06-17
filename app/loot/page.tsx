import { notFound } from "next/navigation";
import { Coins, Grid3x3 } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listLootMembersWithBalances, listSessions } from "@/lib/queries/loot";
import { formatPoints } from "@/lib/loot";
import { AddParticipantForm } from "./add-participant-form";
import { StandingBand } from "@/components/loot/standing-band";
import { NearYou } from "@/components/loot/near-you";
import { LatestSessionCard } from "@/components/loot/latest-session-card";
import { LeaderboardCollapsible } from "@/components/loot/leaderboard-collapsible";

export default async function LootPage() {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  const isOfficer = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const ctx = makeTenantContext(tenant.id);
  const [members, sessions] = await Promise.all([
    listLootMembersWithBalances(ctx),
    listSessions(ctx),
  ]);

  const myIdx = viewer ? members.findIndex((m) => m.membershipId === viewer.id) : -1;
  const me = myIdx >= 0 ? members[myIdx] : null;

  const nearbyRaw = myIdx >= 0
    ? members.slice(Math.max(0, myIdx - 2), myIdx + 3)
    : [];
  const nearbyRows = nearbyRaw.map((m, i) => ({
    ...m,
    rank: Math.max(0, myIdx - 2) + i + 1,
    isMe: m.membershipId === viewer?.id,
  }));

  const latestSession = sessions[0] ?? null;
  const topBalance = members[0]?.balanceTenths ?? null;

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header — mirrors FG layout exactly */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
            <Coins className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Loot Points</h1>
            <p className="text-sm text-text-muted">Earn at events, spend at the Sunday loot pile.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:pt-1">
          <a
            href="/loot/sessions"
            className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            Sessions
          </a>
          {isOfficer && (
            <a
              href="/loot/sessions/new"
              className="inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-xs text-fg-cream hover:bg-primary/80"
            >
              <Coins className="h-3.5 w-3.5" />
              Run loot session
            </a>
          )}
        </div>
      </div>

      {/* Standing band — hero section for viewer */}
      {me ? (
        <StandingBand
          rank={myIdx + 1}
          total={members.length}
          displayName={me.displayName}
          balanceTenths={me.balanceTenths}
          memberId={me.id}
        />
      ) : (
        <section className="border border-border bg-surface-elevated/60 p-4 sm:p-6">
          <p className="mfd-label text-text-muted">[ Your standing ]</p>
          <p className="mt-2 text-sm text-text-secondary">
            You don&apos;t have a loot wallet yet. An officer can add you from Sessions.
          </p>
        </section>
      )}

      {isOfficer && <AddParticipantForm />}

      {/* 2fr / 1fr grid: NearYou + pool/session card */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <NearYou rows={nearbyRows} />
        <LatestSessionCard
          session={latestSession}
          totalMembers={members.length}
          topBalance={topBalance}
          formatPoints={formatPoints}
        />
      </div>

      {/* Collapsible full leaderboard */}
      <LeaderboardCollapsible
        members={members}
        viewerMembershipId={viewer?.id ?? null}
      />
    </div>
  );
}
