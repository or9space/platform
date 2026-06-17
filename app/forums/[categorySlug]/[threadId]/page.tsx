import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getThread } from "@/lib/queries/forums";
import { ReplyForm } from "./reply-form";
import { PostActions } from "./post-actions";
import { MfdPanel } from "@/components/ui/mfd";
import { ArrowLeft, Pin, Lock, MessageSquare, Clock } from "lucide-react";

function fmtDateTime(d: Date): string {
  const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${mo} ${d.getDate()}, ${d.getFullYear()} at ${hh}:${mm}`;
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ categorySlug: string; threadId: string }>;
}) {
  const { categorySlug, threadId } = await params;

  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);

  const ctx = makeTenantContext(tenant.id);
  const thread = await getThread(ctx, threadId);
  if (!thread) notFound();

  if (thread.category.slug !== categorySlug) notFound();

  const canModerate = viewer ? hasTier(viewer.tier, "OFFICER") : false;
  const myMembershipId = viewer?.id ?? null;
  const isLoggedIn = viewer !== null;

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <a href="/forums" className="flex items-center gap-1 hover:text-primary transition-colors">
          <ArrowLeft className="h-3 w-3" />
          <span className="mfd-label">FORUMS</span>
        </a>
        <span>/</span>
        <a
          href={`/forums/${categorySlug}`}
          className="mfd-label hover:text-primary transition-colors"
        >
          {categorySlug.toUpperCase()}
        </a>
        <span>/</span>
        <span className="mfd-label truncate text-text-secondary max-w-[160px]">
          {thread.title.toUpperCase()}
        </span>
      </div>

      {/* Thread header panel */}
      <MfdPanel
        chassis="primary"
        title={
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>[ THREAD ]</span>
          </div>
        }
        titleAside={
          canModerate ? (
            <PostActions
              threadId={thread.id}
              posts={[]}
              myMembershipId={myMembershipId}
              canModerate={canModerate}
              isPinned={thread.isPinned}
              isLocked={thread.isLocked}
              showThreadControls
            />
          ) : undefined
        }
        bodyPadding="md"
      >
        <div className="flex flex-wrap items-start gap-2">
          {thread.isPinned && (
            <Pin className="mt-1 h-4 w-4 shrink-0 text-primary" />
          )}
          {thread.isLocked && (
            <Lock className="mt-1 h-4 w-4 shrink-0 text-text-muted" />
          )}
          <h1 className="text-xl font-bold text-text-primary leading-tight">
            {thread.title}
          </h1>
        </div>
        {thread.isLocked && (
          <p className="mt-2 mfd-label text-xs text-text-muted">THREAD LOCKED — replies disabled</p>
        )}
      </MfdPanel>

      {/* Posts */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ POSTS ]</span>}
        titleAside={
          <span className="mfd-label text-xs">{thread.posts.length} total</span>
        }
        bodyPadding="none"
      >
        <ul className="divide-y divide-border/40">
          {thread.posts.map((post, i) => (
            <li
              key={post.id}
              className={i === 0 ? "border-l-2 border-primary" : ""}
            >
              <div className="px-4 py-4 space-y-3">
                {/* Post header — matches FG's Card layout: avatar initials + name/tier + timestamp */}
                <div className="flex gap-3 sm:gap-4">
                  {/* Author column */}
                  <div className="hidden shrink-0 text-center sm:flex sm:flex-col sm:items-center sm:gap-1 sm:w-16">
                    {/* Avatar initials box */}
                    <span className="flex h-9 w-9 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-xs font-mono font-bold text-primary">
                      {(post.authorName ?? "?").slice(0, 2).toUpperCase()}
                    </span>
                    <p className="text-xs font-medium text-text-primary leading-tight">
                      {post.authorName}
                    </p>
                    {i === 0 && (
                      <span className="mfd-label text-xs text-primary">OP</span>
                    )}
                  </div>
                  {/* Mobile: inline initials */}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-xs font-mono font-bold text-primary sm:hidden">
                    {(post.authorName ?? "?").slice(0, 2).toUpperCase()}
                  </span>

                  {/* Content column */}
                  <div className="min-w-0 flex-1">
                    {/* Meta row */}
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                      <span className="font-medium text-text-primary sm:hidden">
                        {post.authorName}
                      </span>
                      {i === 0 && (
                        <span className="sm:hidden mfd-label text-xs text-primary">OP</span>
                      )}
                      <Clock className="h-3 w-3" />
                      <span>{fmtDateTime(post.createdAt)}</span>
                      {post.isEdited && (
                        <span className="mfd-label italic text-text-muted">(edited)</span>
                      )}
                    </div>

                    {/* Post content */}
                    <p className="whitespace-pre-wrap text-sm text-text-secondary leading-relaxed">
                      {post.content}
                    </p>

                    {/* Post actions */}
                    {(myMembershipId === post.authorMembershipId || canModerate) && !thread.isLocked && (
                      <div className="mt-2">
                        <PostActions
                          threadId={thread.id}
                          posts={[post]}
                          myMembershipId={myMembershipId}
                          canModerate={canModerate}
                          isPinned={thread.isPinned}
                          isLocked={thread.isLocked}
                          showThreadControls={false}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </MfdPanel>

      {/* Reply panel */}
      <MfdPanel
        chassis={thread.isLocked ? "neutral" : "primary"}
        title={<span>[ REPLY ]</span>}
        bodyPadding="md"
      >
        {isLoggedIn ? (
          <ReplyForm threadId={thread.id} disabled={thread.isLocked} />
        ) : (
          <p className="text-sm text-text-muted">
            <a href="/login" className="text-primary underline">Sign in</a> to reply.
          </p>
        )}
      </MfdPanel>
    </div>
  );
}
