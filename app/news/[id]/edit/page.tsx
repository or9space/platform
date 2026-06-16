import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getNews } from "@/lib/queries/news";
import { NewsForm } from "@/components/news/news-form";

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  const { id } = await params;
  const post = await getNews(makeTenantContext(ctx.tenant.id), id);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit post</h1>
        <a href={`/news/${id}`} className="text-sm text-text-secondary underline hover:text-text-primary">← Cancel</a>
      </div>
      <NewsForm postId={id} initial={{ title: post.title, body: post.body, category: post.category, isPinned: post.isPinned }} />
    </main>
  );
}
