import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getHandbookBySlug } from "@/lib/queries/handbook";
import { UpsertSectionForm } from "./upsert-section-form";
import { DeleteSectionButton } from "./delete-section-button";
import { StatusControls } from "./status-controls";
import { MfdPanel } from "@/components/ui/mfd";
import { BookMarked, Eye } from "lucide-react";

export default async function HandbookEditPage({
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
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  const ctx = makeTenantContext(tenant.id);
  const hb = await getHandbookBySlug(ctx, slug);
  if (!hb) notFound();

  const isCommand = hasTier(viewer.tier, "COMMAND");

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
            <p className="text-sm text-text-muted">
              EDIT HANDBOOK
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="mfd-label text-xs text-text-muted">v{hb.version} — {hb.status}</span>
          <a
            href={`/handbook/${slug}`}
            className="flex items-center gap-1.5 rounded border border-border-light px-3 py-1.5 text-sm text-text-secondary hover:border-primary hover:text-text-primary transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </a>
        </div>
      </div>

      {/* Status controls */}
      {isCommand && (
        <MfdPanel
          chassis="amber"
          title={<span>[ STATUS ]</span>}
          bodyPadding="md"
        >
          <StatusControls handbookId={hb.id} currentStatus={hb.status} />
        </MfdPanel>
      )}

      {/* Sections list */}
      <MfdPanel
        chassis="primary"
        title={<span>[ SECTIONS ]</span>}
        titleAside={<span className="mfd-label">{hb.sections.length} entries</span>}
        bodyPadding="sm"
      >
        {hb.sections.length === 0 ? (
          <p className="py-2 text-sm text-text-muted">No sections yet.</p>
        ) : (
          <ul className="space-y-2">
            {hb.sections.map((section) => (
              <li
                key={section.id}
                className="flex items-center justify-between border border-border bg-surface px-3 py-2.5 mfd-cut-tl-br"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary">{section.title}</p>
                  <p className="mfd-label text-xs text-text-muted">Order: {section.orderIndex}</p>
                </div>
                <div className="ml-4 shrink-0">
                  <DeleteSectionButton sectionId={section.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </MfdPanel>

      {/* Add section form */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ ADD SECTION ]</span>}
        bodyPadding="md"
      >
        <UpsertSectionForm handbookId={hb.id} />
      </MfdPanel>
    </div>
  );
}
