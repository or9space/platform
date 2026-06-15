import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getNews } from "@/lib/queries/news";
import { formatDateTime } from "@/lib/format";
import { CategoryBadge } from "@/components/news/category-badge";
import { DeleteNewsButton } from "@/components/news/delete-news-button";

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const canManage = hasTier(viewer.tier, "OFFICER");

  const { id } = await params;
  const post = await getNews(makeTenantContext(ctx.tenant.id), id);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <a href="/news" className="text-sm text-neutral-400 underline hover:text-neutral-100">← News</a>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {post.isPinned && <span className="text-xs font-semibold uppercase text-amber-400">Pinned</span>}
            <CategoryBadge category={post.category} />
          </div>
          <h1 className="mt-2 text-2xl font-bold">{post.title}</h1>
          <p className="text-xs text-neutral-500">{post.authorName} · {formatDateTime(post.createdAt)}</p>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-2">
            <a href={`/news/${post.id}/edit`} className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500">Edit</a>
            <DeleteNewsButton postId={post.id} />
          </div>
        )}
      </div>
      <article className="whitespace-pre-wrap text-neutral-200">{post.body}</article>
    </main>
  );
}
