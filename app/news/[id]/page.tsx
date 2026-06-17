import { notFound } from "next/navigation";
import { Newspaper, Pin } from "lucide-react";
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
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* MFD page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Newspaper className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">News</h1>
          <p className="text-sm text-text-muted">Dispatches and announcements</p>
        </div>
      </div>

      <a href="/news" className="mfd-label text-xs text-text-secondary hover:text-text-primary">← Back to news</a>

      <MfdPanel
        chassis={post.isPinned ? "primary" : "neutral"}
        title={
          <span className="flex items-center gap-2">
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
              <a href={`/news/${post.id}/edit`} className="rounded border border-border-light px-2 py-0.5 text-xs hover:border-primary">
                Edit
              </a>
              <DeleteNewsButton postId={post.id} />
            </div>
          ) : undefined
        }
        bodyPadding="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CategoryBadge category={post.category} />
          </div>
          <h2 className="text-xl font-bold text-text-primary">{post.title}</h2>
          <p className="mfd-label text-xs">{post.authorName} · {formatDateTime(post.createdAt)}</p>
          <article className="whitespace-pre-wrap text-sm text-text-primary leading-relaxed">{post.body}</article>
        </div>
      </MfdPanel>
    </div>
  );
}
