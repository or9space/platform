import { notFound } from "next/navigation";
import { Newspaper } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getNews } from "@/lib/queries/news";
import { NewsForm } from "@/components/news/news-form";
import { MfdPanel } from "@/components/ui/mfd";

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  const { id } = await params;
  const post = await getNews(makeTenantContext(ctx.tenant.id), id);
  if (!post) notFound();

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* MFD page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Newspaper className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Edit post</h1>
          <p className="text-sm text-text-muted">Modify dispatch content</p>
        </div>
      </div>

      <a href={`/news/${id}`} className="mfd-label text-xs text-text-secondary hover:text-text-primary">← Cancel</a>

      <MfdPanel
        chassis="neutral"
        title={<span>[ NEWS ] EDIT</span>}
        bodyPadding="lg"
      >
        <NewsForm postId={id} initial={{ title: post.title, body: post.body, category: post.category, isPinned: post.isPinned }} />
      </MfdPanel>
    </div>
  );
}
