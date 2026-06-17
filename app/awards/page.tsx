import { notFound } from "next/navigation";
import { Medal } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listAwardsWithRecipients } from "@/lib/queries/awards";
import { MfdPanel } from "@/components/ui/mfd";
import { AwardCreateForm, GrantForm, DeleteAwardButton, RevokeButton } from "@/components/awards/awards-client";

export default async function AwardsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const awards = await listAwardsWithRecipients(makeTenantContext(ctx.tenant.id));

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={Medal} title="Awards" subtitle="Recognition and commendations" />

      {/* Create form for officers */}
      {canManage && (
        <MfdPanel chassis="primary" title={<span>[ NEW AWARD ]</span>} bodyPadding="md">
          <AwardCreateForm />
        </MfdPanel>
      )}

      {/* Awards list */}
      {awards.length === 0 ? (
        <MfdPanel chassis="neutral" bodyPadding="md">
          <p className="mfd-label text-center">NO AWARDS ON RECORD</p>
        </MfdPanel>
      ) : (
        <div className="space-y-4">
          {awards.map((a) => (
            <MfdPanel
              key={a.id}
              chassis="neutral"
              title={<span>[ {a.name.toUpperCase()} ]</span>}
              titleAside={canManage ? <DeleteAwardButton id={a.id} /> : undefined}
              bodyPadding="md"
            >
              {a.description && (
                <p className="mb-3 text-sm text-text-secondary">{a.description}</p>
              )}

              {a.recipients.length > 0 && (
                <div className="mb-3">
                  <p className="mfd-label mb-2">
                    RECIPIENTS
                    <span className="mfd-readout ml-2">{a.recipients.length}</span>
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {a.recipients.map((r) => (
                      <li
                        key={r.membershipId}
                        className="flex items-center gap-1 rounded border border-border bg-surface-elevated px-2 py-1 text-xs"
                      >
                        <a
                          href={`/members/${r.username}`}
                          className="text-text-primary hover:underline"
                        >
                          {r.name}
                        </a>
                        {r.note && (
                          <span className="text-text-muted">· {r.note}</span>
                        )}
                        {canManage && (
                          <RevokeButton awardId={a.id} membershipId={r.membershipId} />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {canManage && <GrantForm awardId={a.id} />}
            </MfdPanel>
          ))}
        </div>
      )}
    </div>
  );
}
