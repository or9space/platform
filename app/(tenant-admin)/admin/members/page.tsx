import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { notFound } from "next/navigation";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { listMembers } from "@/lib/queries/members";
import { makeTenantContext } from "@/lib/tenant";
import { Rank } from "@/components/rank";
import { RankControls } from "./rank-controls";
import { LoginLinkButton } from "@/components/admin/login-link-button";
import { Users } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";

export default async function AdminMembersPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const { tenant } = ctx;

  // Guard: must check COMMAND before running any member queries to prevent
  // RSC-payload leak — mirrors config/page.tsx exactly.
  const m = await getViewerMembership(tenant.id, await getSessionAccountId());
  if (!m || !hasTier(m.tier, "COMMAND")) return notFound();

  const tenantCtx = makeTenantContext(tenant.id);
  const members = await listMembers(tenantCtx);

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Users className="h-5 w-5" />
        </span>
        <div className="flex-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">MEMBERS</h1>
            <p className="text-sm text-text-muted">Rank management and access control</p>
          </div>
          <span className="mfd-readout text-2xl font-semibold">{members.length}</span>
        </div>
      </div>

      <MfdPanel
        chassis="neutral"
        title={<span>[ ROSTER ]</span>}
        titleAside={<a href="/members" className="mfd-label text-text-muted hover:text-text-secondary">← back to members</a>}
        bodyPadding="none"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-4 py-2 text-left"><span className="mfd-label">Member</span></th>
                <th className="px-4 py-2 text-left"><span className="mfd-label">Rank</span></th>
                <th className="px-4 py-2 text-left"><span className="mfd-label">Change rank</span></th>
                <th className="px-4 py-2 text-left"><span className="mfd-label">Login link</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {members.map((member) => {
                const initials = (member.displayName ?? member.username)
                  .slice(0, 2)
                  .toUpperCase();
                const isSelf = member.id === m.id;
                return (
                  <tr key={member.id} className={`align-middle ${isSelf ? "bg-primary/10" : "hover:bg-surface-elevated"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-xs font-semibold text-text-secondary">
                            {initials}
                          </div>
                        )}
                        <div className="leading-tight">
                          <div className="font-medium text-text-primary">
                            {member.displayName ?? member.username}
                          </div>
                          <div className="mfd-label">@{member.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <Rank tier={member.tier} />
                    </td>
                    <td className="px-4 py-3">
                      <RankControls
                        membershipId={member.id}
                        currentTier={member.tier}
                        username={member.username}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <LoginLinkButton tenantId={tenant.id} membershipId={member.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </MfdPanel>
    </div>
  );
}
