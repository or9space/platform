import { notFound } from "next/navigation";
import { ArrowLeft, Newspaper, Pin, Calendar, User } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getNews } from "@/lib/queries/news";
import { formatDateTime } from "@/lib/format";
import { CategoryBadge } from "@/components/news/category-badge";
import { DeleteNewsButton } from "@/components/news/delete-news-button";
import { MfdPanel } from "@/components/ui/mfd";

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
    <div className="p-3 sm:p-6 animate-page-enter">
      {/* Back link — matches FG inline back-nav style */}
      <a href="/news" className="mb-6 inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to News
      </a>

      <article className="mx-auto max-w-3xl">
        {/* Article panel — primary chassis for pinned, neutral otherwise */}
        <MfdPanel
          chassis={post.isPinned ? "primary" : "neutral"}
          title={
            <span className="flex items-center gap-2">
              <Newspaper className="h-3.5 w-3.5" />
              <span>[ NEWS ]</span>
              {post.isPinned && (
                <span className="flex items-center gap-1 text-amber">
                  <Pin className="h-3 w-3" /> Pinned
                </span>
              )}
            </span>
          }
          titleAside={
            canManage ? (
              <div className="flex items-center gap-2">
                <a href={`/news/${post.id}/edit`} className="rounded border border-border-light px-2 py-0.5 text-xs hover:border-primary transition-colors">
                  Edit
                </a>
                <DeleteNewsButton postId={post.id} />
              </div>
            ) : undefined
          }
          bodyPadding="lg"
        >
          <div className="space-y-4">
            {/* Category + pinned badge row */}
            <div className="flex items-center gap-2">
              <CategoryBadge category={post.category} />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-text-primary">{post.title}</h1>

            {/* Author / date meta row — matches FG icon style */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {post.authorName}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateTime(post.createdAt)}
              </span>
            </div>

            {/* Body content */}
            <div className="border-t border-border/40 pt-4">
              <article className="whitespace-pre-wrap text-sm text-text-primary leading-relaxed">{post.body}</article>
            </div>
          </div>
        </MfdPanel>
      </article>
    </div>
  );
}
