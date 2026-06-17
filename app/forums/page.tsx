import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getCategories } from "@/lib/queries/forums";
import { MfdPanel, MfdReadout } from "@/components/ui/mfd";
import { MessagesSquare, Clock, User } from "lucide-react";

export default async function ForumsPage() {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  const canManageCategories = viewer ? hasTier(viewer.tier, "COMMAND") : false;

  const ctx = makeTenantContext(tenant.id);
  const categories = await getCategories(ctx);

  const totalThreads = categories.reduce((s, c) => s + c.threadCount, 0);
  const totalPosts = categories.reduce((s, c) => s + c.postCount, 0);

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <MessagesSquare className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Forums</h1>
          <p className="text-sm text-text-muted">Org discussion and updates</p>
        </div>
      </div>

      {/* Summary readouts */}
      <div className="flex flex-wrap gap-6">
        <MfdReadout label="CATEGORIES" value={categories.length} tone="primary" size="sm" />
        <MfdReadout label="THREADS" value={totalThreads} tone="amber" size="sm" />
        <MfdReadout label="POSTS" value={totalPosts} tone="muted" size="sm" />
      </div>

      {/* Admin link */}
      {canManageCategories && (
        <div className="flex justify-end">
          <a
            href="/forums/admin-categories"
            className="mfd-label border border-border px-3 py-1.5 text-xs hover:border-primary hover:text-primary transition-colors"
          >
            [ MANAGE CATEGORIES ]
          </a>
        </div>
      )}

      {/* Categories panel */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ CATEGORIES ]</span>}
        titleAside={
          <span className="mfd-readout text-xs">
            {categories.length} active
          </span>
        }
        bodyPadding="none"
      >
        {categories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <MessagesSquare className="h-8 w-8 text-text-muted opacity-40" />
            <p className="mfd-label">NO CATEGORIES CONFIGURED</p>
            <p className="text-xs text-text-muted">Command staff create categories from the admin panel.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {categories.map((cat) => (
              <li key={cat.id}>
                <a
                  href={`/forums/${cat.slug}`}
                  className="group flex items-start gap-4 px-4 py-4 hover:bg-surface-elevated transition-colors"
                >
                  {/* Icon */}
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-surface mfd-cut-tl-br text-primary group-hover:border-primary transition-colors">
                    <MessagesSquare className="h-4 w-4" />
                  </span>

                  {/* Name + description + latest thread */}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                      {cat.name}
                    </p>
                    {cat.description && (
                      <p className="mt-0.5 text-xs text-text-muted">{cat.description}</p>
                    )}
                    {/* Thread + post counts */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <span className="mfd-label text-xs">
                        {cat.threadCount} <span className="text-text-muted">threads</span>
                      </span>
                      <span className="mfd-label text-xs">
                        {cat.postCount} <span className="text-text-muted">posts</span>
                      </span>
                    </div>
                    {/* Latest thread strip */}
                    {cat.latestThread && (
                      <div className="mt-2 flex items-center gap-2 rounded-sm border border-border/40 bg-surface px-2 py-1.5 text-xs">
                        <Clock className="h-3 w-3 shrink-0 text-text-muted" />
                        <span className="truncate text-text-secondary">{cat.latestThread.title}</span>
                        <span className="shrink-0 text-text-muted">by</span>
                        <span className="flex shrink-0 items-center gap-1 text-primary">
                          <User className="h-3 w-3" />
                          {cat.latestThread.authorName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Hover caret */}
                  <span className="shrink-0 mfd-label text-xs text-text-muted self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    ENTER &rsaquo;
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </MfdPanel>
    </div>
  );
}
