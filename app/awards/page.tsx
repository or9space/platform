import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listAwardsWithRecipients } from "@/lib/queries/awards";
import { AwardCreateForm, GrantForm, DeleteAwardButton, RevokeButton } from "@/components/awards/awards-client";

export default async function AwardsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const awards = await listAwardsWithRecipients(makeTenantContext(ctx.tenant.id));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Awards</h1>
      {canManage && <AwardCreateForm />}

      {awards.length === 0 ? (
        <p className="text-sm text-neutral-500">No awards yet.</p>
      ) : (
        <ul className="space-y-4">
          {awards.map((a) => (
            <li key={a.id} className="rounded border border-neutral-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-neutral-100">{a.name}</p>
                  {a.description && <p className="text-sm text-neutral-400">{a.description}</p>}
                </div>
                {canManage && <DeleteAwardButton id={a.id} />}
              </div>
              {a.recipients.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {a.recipients.map((r) => (
                    <li key={r.membershipId} className="flex items-center gap-1 rounded border border-neutral-700 px-2 py-1 text-xs">
                      <a href={`/members/${r.username}`} className="text-neutral-200 hover:underline">{r.name}</a>
                      {r.note && <span className="text-neutral-500">· {r.note}</span>}
                      {canManage && <RevokeButton awardId={a.id} membershipId={r.membershipId} />}
                    </li>
                  ))}
                </ul>
              )}
              {canManage && <GrantForm awardId={a.id} />}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
