import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listSquadsWithMembers } from "@/lib/queries/squads";
import { MfdPanel } from "@/components/ui/mfd";
import { SquadCreateForm, AddMemberForm, DeleteSquadButton, RemoveMemberButton } from "@/components/squads/squads-client";

export default async function SquadsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const canManage = hasTier(viewer.tier, "OFFICER");

  const squads = await listSquadsWithMembers(makeTenantContext(ctx.tenant.id));

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Squads</h1>
          <p className="text-sm text-text-muted">Organized fire teams and unit groups.</p>
        </div>
      </div>

      {canManage && (
        <MfdPanel chassis="primary" bodyPadding="md" title={<span>[ NEW SQUAD ]</span>}>
          <SquadCreateForm />
        </MfdPanel>
      )}

      <MfdPanel
        chassis="neutral"
        bodyPadding="sm"
        title={<span>[ SQUADS ]</span>}
        titleAside={<span className="mfd-readout text-[10px]">{squads.length}</span>}
      >
        {squads.length === 0 ? (
          <p className="px-1 py-2 text-sm text-text-muted">No squads yet.</p>
        ) : (
          <ul className="space-y-3">
            {squads.map((s) => (
              <li key={s.id} className="border border-border bg-surface-elevated p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">
                      {s.name}{" "}
                      <span className="mfd-readout text-xs ml-1">{s.members.length}</span>
                    </p>
                    {s.description && <p className="text-sm text-text-secondary">{s.description}</p>}
                  </div>
                  {canManage && <DeleteSquadButton id={s.id} />}
                </div>
                {s.members.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {s.members.map((m) => (
                      <li key={m.membershipId} className="flex items-center gap-1 border border-border px-2 py-1 text-xs">
                        <a href={`/members/${m.username}`} className="text-text-primary hover:underline">{m.name}</a>
                        {m.role && <span className="mfd-label">· {m.role}</span>}
                        {canManage && <RemoveMemberButton squadId={s.id} membershipId={m.membershipId} />}
                      </li>
                    ))}
                  </ul>
                )}
                {canManage && <AddMemberForm squadId={s.id} />}
              </li>
            ))}
          </ul>
        )}
      </MfdPanel>
    </div>
  );
}
