import { notFound } from "next/navigation";
import { Medal, Star, Trophy, Shield, Award } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listAwardsWithRecipients, listNominations, type AwardKind } from "@/lib/queries/awards";
import { MfdPanel } from "@/components/ui/mfd";
import { AwardCreateForm, GrantForm, DeleteAwardButton, RevokeButton, NominateButton, NominationsPanelClient } from "@/components/awards/awards-client";
import type { ElementType } from "react";

const KIND_ORDER: AwardKind[] = ["MEDAL", "RIBBON", "COMMENDATION", "TROPHY", "BADGE"];

const KIND_META: Record<AwardKind, { label: string; Icon: ElementType; iconCls: string }> = {
  MEDAL:        { label: "Medals",        Icon: Medal,   iconCls: "text-fg-gold" },
  RIBBON:       { label: "Ribbons",       Icon: Award,   iconCls: "text-fg-blue-light" },
  COMMENDATION: { label: "Commendations", Icon: Star,    iconCls: "text-fg-gold-light" },
  TROPHY:       { label: "Trophies",      Icon: Trophy,  iconCls: "text-primary" },
  BADGE:        { label: "Badges",        Icon: Shield,  iconCls: "text-success" },
};

export default async function AwardsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const tenantCtx = makeTenantContext(ctx.tenant.id);
  const awards = await listAwardsWithRecipients(tenantCtx);
  const nominations = canManage ? await listNominations(tenantCtx) : [];

  // Group by kind, preserving KIND_ORDER
  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    awards: awards.filter((a) => a.kind === kind),
  })).filter((g) => g.awards.length > 0 || (canManage && g.kind === "MEDAL"));

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={Medal} title="Awards" subtitle="Recognition and commendations" />

      {/* Create form for officers */}
      {canManage && (
        <MfdPanel chassis="primary" title={<span>[ NEW AWARD ]</span>} bodyPadding="md">
          <AwardCreateForm />
        </MfdPanel>
      )}

      {/* Pending nominations panel for officers */}
      {canManage && (
        <MfdPanel
          chassis="primary"
          title={<span>[ PENDING NOMINATIONS ] <span className="mfd-readout ml-1">{nominations.filter((n) => n.status === "PENDING").length}</span></span>}
          bodyPadding="none"
        >
          <NominationsPanelClient nominations={nominations} />
        </MfdPanel>
      )}

      {/* Empty state */}
      {awards.length === 0 && !canManage && (
        <MfdPanel chassis="neutral" bodyPadding="md">
          <p className="mfd-label text-center">NO AWARDS ON RECORD</p>
        </MfdPanel>
      )}

      {/* Grouped award sections */}
      {grouped.map(({ kind, awards: kindAwards }) => {
        const { label, Icon, iconCls } = KIND_META[kind];
        return (
          <MfdPanel
            key={kind}
            chassis="neutral"
            title={
              <span className="flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${iconCls}`} />
                {label.toUpperCase()}
                <span className="mfd-readout ml-1">{kindAwards.length}</span>
              </span>
            }
            bodyPadding="none"
          >
            {kindAwards.length === 0 ? (
              <p className="mfd-label px-4 py-3 text-center text-text-muted">NONE ON RECORD</p>
            ) : (
              <div className="divide-y divide-border/40">
                {kindAwards.map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${iconCls}`} />
                        <span className="mfd-label text-text-primary">{a.name.toUpperCase()}</span>
                      </div>
                      {canManage && <DeleteAwardButton id={a.id} />}
                    </div>

                    {a.description && (
                      <p className="mb-2 ml-6 text-xs text-text-secondary">{a.description}</p>
                    )}

                    {a.recipients.length > 0 && (
                      <div className="ml-6 mb-2">
                        <p className="mfd-label mb-1">
                          RECIPIENTS
                          <span className="mfd-readout ml-2">{a.recipients.length}</span>
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {a.recipients.map((r) => (
                            <li
                              key={r.membershipId}
                              className="flex items-center gap-1 rounded border border-border bg-surface-elevated px-2 py-0.5 text-xs"
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

                    {viewer && <div className="ml-6"><NominateButton awardId={a.id} /></div>}
                    {canManage && <div className="ml-6"><GrantForm awardId={a.id} /></div>}
                  </div>
                ))}
              </div>
            )}
          </MfdPanel>
        );
      })}
    </div>
  );
}
