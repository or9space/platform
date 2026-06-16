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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <a href="/members" className="text-sm text-text-secondary hover:text-text-primary underline">
          ← Back to members
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-text-secondary">
              <th className="pb-2 pr-4 font-medium">Member</th>
              <th className="pb-2 pr-4 font-medium">Rank</th>
              <th className="pb-2 pr-4 font-medium">Change rank</th>
              <th className="pb-2 font-medium">Login link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => {
              const initials = (member.displayName ?? member.username)
                .slice(0, 2)
                .toUpperCase();
              return (
                <tr key={member.id} className="align-middle">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-xs font-semibold">
                          {initials}
                        </div>
                      )}
                      <div className="leading-tight">
                        <div className="font-medium">
                          {member.displayName ?? member.username}
                        </div>
                        <div className="text-text-secondary">@{member.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-text-secondary">
                    <Rank tier={member.tier} />
                  </td>
                  <td className="py-3 pr-4">
                    <RankControls
                      membershipId={member.id}
                      currentTier={member.tier}
                      username={member.username}
                    />
                  </td>
                  <td className="py-3">
                    <LoginLinkButton tenantId={tenant.id} membershipId={member.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
