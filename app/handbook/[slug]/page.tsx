import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getHandbookBySlug, getViewerAck } from "@/lib/queries/handbook";
import { AcknowledgeButton } from "./acknowledge-button";
import { MfdPanel } from "@/components/ui/mfd";
import { BookMarked, Pencil } from "lucide-react";

export default async function HandbookSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  if (!viewer) notFound();

  const ctx = makeTenantContext(tenant.id);
  const hb = await getHandbookBySlug(ctx, slug);
  if (!hb) notFound();

  if (hb.status !== "PUBLISHED" && !hasTier(viewer.tier, "OFFICER")) notFound();

  const ack = hb.status === "PUBLISHED"
    ? await getViewerAck(ctx, hb.id, viewer.id)
    : null;

  const isOfficer = hasTier(viewer.tier, "OFFICER");

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
            <BookMarked className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{hb.title}</h1>
            {hb.subtitle && (
              <p className="text-sm text-text-muted">{hb.subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="mfd-label text-xs text-text-muted">v{hb.version}</span>
          {isOfficer && (
            <a
              href={`/handbook/${slug}/edit`}
              className="flex items-center gap-1.5 rounded border border-border-light px-3 py-1.5 text-sm text-text-secondary hover:border-primary hover:text-text-primary transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </a>
          )}
        </div>
      </div>

      {/* Acknowledge panel */}
      {hb.status === "PUBLISHED" && (
        <MfdPanel
          chassis="primary"
          title={<span>[ ACKNOWLEDGE ]</span>}
          bodyPadding="md"
        >
          <AcknowledgeButton
            handbookId={hb.id}
            version={hb.version}
            ack={ack}
          />
        </MfdPanel>
      )}

      {/* Sections */}
      {hb.sections.length === 0 ? (
        <MfdPanel chassis="neutral" title={<span>[ SECTIONS ]</span>} bodyPadding="md">
          <p className="text-sm text-text-muted">No sections yet.</p>
        </MfdPanel>
      ) : (
        <div className="space-y-4">
          {hb.sections.map((section) => (
            <MfdPanel
              key={section.id}
              chassis="neutral"
              title={<span>[ {section.title.toUpperCase()} ]</span>}
              bodyPadding="md"
            >
              <div className="whitespace-pre-wrap text-text-secondary leading-relaxed">
                {section.body}
              </div>
            </MfdPanel>
          ))}
        </div>
      )}
    </div>
  );
}
