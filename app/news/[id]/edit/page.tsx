import { notFound } from "next/navigation";
import { ArrowLeft, Newspaper } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader icon={Newspaper} title="Edit Post" subtitle="Modify dispatch content" />

      <a href={`/news/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to article
      </a>

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
