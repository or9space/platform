import { notFound } from "next/navigation";
import { ArrowLeft, Newspaper } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { NewsForm } from "@/components/news/news-form";
import { MfdPanel } from "@/components/ui/mfd";

export default async function NewNewsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* MFD page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Newspaper className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">New post</h1>
          <p className="text-sm text-text-muted">Compose a new dispatch</p>
        </div>
      </div>

      <a href="/news" className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to News
      </a>

      <MfdPanel
        chassis="neutral"
        title={<span>[ NEWS ] COMPOSE</span>}
        bodyPadding="lg"
      >
        <NewsForm />
      </MfdPanel>
    </div>
  );
}
