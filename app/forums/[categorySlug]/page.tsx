import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { getThreadsByCategory } from "@/lib/queries/forums";
import { NewThreadForm } from "./new-thread-form";
import { MfdPanel, MfdReadout } from "@/components/ui/mfd";
import { ArrowLeft, Pin, Lock, MessageSquare } from "lucide-react";

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;

  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);

  const ctx = makeTenantContext(tenant.id);
  const data = await getThreadsByCategory(ctx, categorySlug);
  if (!data) notFound();

  const { category, threads } = data;
  const isLoggedIn = viewer !== null;

  const pinnedCount = threads.filter((t) => t.isPinned).length;
  const lockedCount = threads.filter((t) => t.isLocked).length;

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <a href="/forums" className="flex items-center gap-1 hover:text-primary transition-colors">
          <ArrowLeft className="h-3 w-3" />
          <span className="mfd-label">FORUMS</span>
        </a>
        <span>/</span>
        <span className="mfd-label text-text-secondary">{category.name.toUpperCase()}</span>
      </div>

      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{category.name}</h1>
          {category.description && (
            <p className="text-sm text-text-muted">{category.description}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-6">
        <MfdReadout label="THREADS" value={threads.length} tone="primary" size="sm" />
        {pinnedCount > 0 && (
          <MfdReadout label="PINNED" value={pinnedCount} tone="amber" size="sm" />
        )}
        {lockedCount > 0 && (
          <MfdReadout label="LOCKED" value={lockedCount} tone="muted" size="sm" />
        )}
      </div>

      {/* Thread list */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ THREADS ]</span>}
        titleAside={
          <span className="mfd-label text-xs">{threads.length} total</span>
        }
        bodyPadding="none"
      >
        {threads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <MessageSquare className="h-8 w-8 text-text-muted opacity-40" />
            <p className="mfd-label">NO THREADS YET</p>
            <p className="text-xs text-text-muted">Be the first to post. Set the tone.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {threads.map((t) => (
              <li key={t.id}>
                <a
                  href={`/forums/${categorySlug}/${t.id}`}
                  className="group flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      {t.isPinned && (
                        <Pin className="h-3 w-3 shrink-0 text-primary" />
                      )}
                      {t.isLocked && (
                        <Lock className="h-3 w-3 shrink-0 text-text-muted" />
                      )}
                      <span className="truncate font-medium text-text-primary group-hover:text-primary transition-colors">
                        {t.title}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">
                      <span className="mfd-label">BY</span>{" "}
                      {t.authorName}
                      {t.lastPostAt && (
                        <>
                          {" "}
                          &bull;{" "}
                          {relativeTime(t.lastPostAt)}
                        </>
                      )}
                    </p>
                  </div>
                  {/* Post count + lock/pin indicators */}
                  <div className="shrink-0 flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span className="font-mono tabular-nums">{t.postCount}</span>
                    </span>
                    {t.isLocked && (
                      <span className="mfd-label opacity-60">LOCKED</span>
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </MfdPanel>

      {/* New thread panel */}
      <MfdPanel
        chassis="primary"
        title={<span>[ NEW THREAD ]</span>}
        bodyPadding="md"
      >
        {isLoggedIn ? (
          <NewThreadForm categoryId={category.id} />
        ) : (
          <p className="text-sm text-text-muted">
            <a href="/login" className="text-primary underline">Sign in</a> to start a thread.
          </p>
        )}
      </MfdPanel>
    </div>
  );
}
