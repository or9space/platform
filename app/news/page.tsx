import { notFound } from "next/navigation";
import { Newspaper, Pin, Calendar, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listNews } from "@/lib/queries/news";
import { formatDate } from "@/lib/format";
import { CategoryBadge } from "@/components/news/category-badge";
import { MfdPanel } from "@/components/ui/mfd";

export default async function NewsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const posts = await listNews(makeTenantContext(ctx.tenant.id), 50);

  const pinned = posts.filter((p) => p.isPinned);
  const rest = posts.filter((p) => !p.isPinned);

  return (
    <div className="p-3 sm:p-6 animate-page-enter">
      <PageHeader
        icon={Newspaper}
        title="News"
        subtitle="Dispatches and announcements"
        actions={canManage ? (
          <a href="/news/new" className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream">
            New post
          </a>
        ) : undefined}
      />

      {posts.length === 0 ? (
        <MfdPanel title={<span>[ NEWS ]</span>} bodyPadding="md">
          <p className="text-sm text-text-muted">No posts yet.</p>
        </MfdPanel>
      ) : (
        <div className="space-y-4">
          {/* Pinned posts — primary chassis */}
          {pinned.map((p) => (
            <a key={p.id} href={`/news/${p.id}`} className="block transition-opacity hover:opacity-90">
              <MfdPanel
                chassis="primary"
                interactive
                title={<span>[ NEWS ]</span>}
                titleAside={
                  <span className="flex items-center gap-1 text-xs text-amber">
                    <Pin className="h-3 w-3" /> Pinned
                  </span>
                }
                bodyPadding="md"
              >
                <div className="mb-2 flex items-center gap-2">
                  <CategoryBadge category={p.category} />
                </div>
                <p className="mb-1 text-lg font-semibold text-text-primary">{p.title}</p>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {p.authorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {formatDate(p.createdAt)}
                  </span>
                </div>
              </MfdPanel>
            </a>
          ))}

          {/* Regular posts — neutral chassis */}
          {rest.map((p) => (
            <a key={p.id} href={`/news/${p.id}`} className="block transition-opacity hover:opacity-90">
              <MfdPanel
                chassis="neutral"
                interactive
                title={<span>[ NEWS ]</span>}
                bodyPadding="md"
              >
                <div className="mb-2 flex items-center gap-2">
                  <CategoryBadge category={p.category} />
                </div>
                <p className="mb-1 text-lg font-semibold text-text-primary">{p.title}</p>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {p.authorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {formatDate(p.createdAt)}
                  </span>
                </div>
              </MfdPanel>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
