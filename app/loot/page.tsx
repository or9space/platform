import { notFound } from "next/navigation";
import { Coins, Grid3x3 } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listLootMembersWithBalances } from "@/lib/queries/loot";
import { formatPoints } from "@/lib/loot";
import { MfdPanel } from "@/components/ui/mfd";
import { AddParticipantForm } from "./add-participant-form";

export default async function LootPage() {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  const isOfficer = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const ctx = makeTenantContext(tenant.id);
  const members = await listLootMembersWithBalances(ctx);

  const myIdx = viewer ? members.findIndex((m) => m.membershipId === viewer.id) : -1;
  const me = myIdx >= 0 ? members[myIdx] : null;
  const nearby = myIdx >= 0
    ? members.map((m, i) => ({ ...m, rank: i + 1 })).slice(Math.max(0, myIdx - 2), myIdx + 3)
    : [];

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
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
        {isOfficer && (
          <a href="/loot/sessions" className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary sm:pt-1.5">
            <Grid3x3 className="h-3.5 w-3.5" /> Sessions
          </a>
        )}
      </div>

      {/* Standing band */}
      {me ? (
        <a href={`/loot/${me.id}`} className="block">
          <div className="flex items-center justify-between gap-4 border border-border bg-surface-elevated px-5 py-4 mfd-cut-tl-br transition-colors hover:border-primary/40">
            <div className="min-w-0">
              <p className="mfd-label">[ Your standing ]</p>
              <p className="mt-1 truncate text-lg font-semibold text-text-primary">{me.displayName}</p>
              <p className="mfd-label mt-0.5 text-primary">RANK #{myIdx + 1} OF {members.length}</p>
            </div>
            <div className="text-right">
              <p className="mfd-readout text-3xl font-bold">{formatPoints(me.balanceTenths)}</p>
              <p className="mfd-label">points</p>
            </div>
          </div>
        </a>
      ) : (
        <div className="border border-border bg-surface-elevated/60 p-4 mfd-cut-tl-br sm:p-6">
          <p className="mfd-label text-text-muted">[ Your standing ]</p>
          <p className="mt-2 text-sm text-text-secondary">No loot wallet yet. An officer can add you from Sessions.</p>
        </div>
      )}

      {isOfficer && <AddParticipantForm />}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <MfdPanel chassis="neutral" bodyPadding="sm" title={<span>[ NEAR YOU ]</span>}>
          {nearby.length === 0 ? (
            <p className="px-1 py-2 text-sm text-text-muted">Join a session to appear on the board.</p>
          ) : (
            <ul className="space-y-1">
              {nearby.map((m) => (
                <li key={m.id}>
                  <a href={`/loot/${m.id}`} className={`flex items-center justify-between border px-3 py-2 transition-colors ${m.membershipId === viewer?.id ? "border-primary/50 bg-primary/10" : "border-border bg-surface-elevated hover:border-primary/30 hover:bg-surface-hover"}`}>
                    <span className="truncate"><span className="mr-2 mfd-readout text-xs">#{m.rank}</span><span className="text-text-primary">{m.displayName}</span></span>
                    <span className="mfd-readout text-sm">{formatPoints(m.balanceTenths)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </MfdPanel>

        <MfdPanel chassis="amber" bodyPadding="md" title={<span className="text-amber">[ POOL ]</span>}>
          <dl className="space-y-3">
            <div className="flex items-center justify-between"><dt className="mfd-label">Participants</dt><dd className="mfd-readout text-lg">{members.length}</dd></div>
            <div className="flex items-center justify-between"><dt className="mfd-label">Top balance</dt><dd className="mfd-readout text-lg">{members[0] ? formatPoints(members[0].balanceTenths) : "—"}</dd></div>
          </dl>
        </MfdPanel>
      </div>

      {/* Full leaderboard */}
      <MfdPanel
        chassis="neutral"
        bodyPadding="none"
        title={<><Coins className="h-3 w-3 text-amber" /><span>[ LEADERBOARD ]</span></>}
        titleAside={<span className="mfd-readout text-[10px]">{members.length}</span>}
      >
        {members.length === 0 ? (
          <p className="px-4 py-3 text-sm text-text-muted">No loot participants yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left mfd-label">
                <th className="w-12 px-4 py-2 font-normal">#</th>
                <th className="px-4 py-2 font-normal">Name</th>
                <th className="px-4 py-2 text-right font-normal">Points</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id} className={`border-b border-border/50 ${m.membershipId === viewer?.id ? "bg-primary/10" : "hover:bg-surface-hover/40"}`}>
                  <td className="px-4 py-2"><span className="mfd-readout text-xs">{i + 1}</span></td>
                  <td className="px-4 py-2"><a href={`/loot/${m.id}`} className="text-text-primary hover:text-primary">{m.displayName}</a></td>
                  <td className="px-4 py-2 text-right"><span className={`mfd-readout ${m.balanceTenths < 0 ? "text-fg-red-light" : ""}`}>{formatPoints(m.balanceTenths)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </MfdPanel>
    </div>
  );
}
