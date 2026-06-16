import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listNews } from "@/lib/queries/news";
import { formatDate } from "@/lib/format";
import { CategoryBadge } from "@/components/news/category-badge";

export default async function NewsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const posts = await listNews(makeTenantContext(ctx.tenant.id), 50);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">News</h1>
        {canManage && (
          <a href="/news/new" className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream">
            New post
          </a>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-text-muted">No posts yet.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <a href={`/news/${p.id}`}
                className="block rounded border border-border p-4 transition-colors hover:border-primary">
                <div className="flex items-center gap-2">
                  {p.isPinned && <span className="text-xs font-semibold uppercase text-amber">Pinned</span>}
                  <CategoryBadge category={p.category} />
                </div>
                <p className="mt-2 font-medium text-text-primary">{p.title}</p>
                <p className="text-xs text-text-muted">{p.authorName} · {formatDate(p.createdAt)}</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
