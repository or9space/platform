import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listSquadsWithMembers } from "@/lib/queries/squads";
import { SquadCreateForm, AddMemberForm, DeleteSquadButton, RemoveMemberButton } from "@/components/squads/squads-client";

export default async function SquadsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const canManage = hasTier(viewer.tier, "OFFICER");

  const squads = await listSquadsWithMembers(makeTenantContext(ctx.tenant.id));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Squads</h1>
      {canManage && <SquadCreateForm />}

      {squads.length === 0 ? (
        <p className="text-sm text-neutral-500">No squads yet.</p>
      ) : (
        <ul className="space-y-4">
          {squads.map((s) => (
            <li key={s.id} className="rounded border border-neutral-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-neutral-100">{s.name} <span className="text-xs text-neutral-500">· {s.members.length}</span></p>
                  {s.description && <p className="text-sm text-neutral-400">{s.description}</p>}
                </div>
                {canManage && <DeleteSquadButton id={s.id} />}
              </div>
              {s.members.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {s.members.map((m) => (
                    <li key={m.membershipId} className="flex items-center gap-1 rounded border border-neutral-700 px-2 py-1 text-xs">
                      <a href={`/members/${m.username}`} className="text-neutral-200 hover:underline">{m.name}</a>
                      {m.role && <span className="text-neutral-500">· {m.role}</span>}
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
    </main>
  );
}
