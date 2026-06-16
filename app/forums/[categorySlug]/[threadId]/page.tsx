import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getThread } from "@/lib/queries/forums";
import { ReplyForm } from "./reply-form";
import { PostActions } from "./post-actions";

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

  // Verify thread is in the expected category (slug consistency)
  if (thread.category.slug !== categorySlug) notFound();

  const canModerate = viewer ? hasTier(viewer.tier, "OFFICER") : false;
  const myMembershipId = viewer?.id ?? null;
  const isLoggedIn = viewer !== null;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-1 text-sm">
        <a href="/forums" className="text-text-secondary hover:text-text-primary">Forums</a>
        <span className="mx-2 text-text-muted">/</span>
        <a href={`/forums/${categorySlug}`} className="text-text-secondary hover:text-text-primary">
          {categorySlug}
        </a>
        <span className="mx-2 text-text-muted">/</span>
        <span className="text-text-secondary">{thread.title}</span>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {thread.isPinned && (
            <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs">Pinned</span>
          )}
          {thread.isLocked && (
            <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs">Locked</span>
          )}
          <h1 className="text-2xl font-bold">{thread.title}</h1>
        </div>

        {canModerate && (
          <div className="mt-3">
            <PostActions
              threadId={thread.id}
              posts={[]}
              myMembershipId={myMembershipId}
              canModerate={canModerate}
              isPinned={thread.isPinned}
              isLocked={thread.isLocked}
              showThreadControls
            />
          </div>
        )}
      </div>

      <ul className="mb-8 space-y-4">
        {thread.posts.map((post) => (
          <li key={post.id} className="rounded border border-border p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {post.authorName}
                {post.isEdited && (
                  <span className="ml-2 text-xs font-normal text-text-muted">(edited)</span>
                )}
              </p>
              <p className="text-xs text-text-muted">
                {post.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              </p>
            </div>
            <p className="whitespace-pre-wrap text-sm">{post.content}</p>
            {(myMembershipId === post.authorMembershipId || canModerate) && (
              <div className="mt-3">
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
          </li>
        ))}
      </ul>

      {isLoggedIn ? (
        <div className="rounded border border-border p-4">
          <h2 className="mb-3 font-semibold">Reply</h2>
          <ReplyForm threadId={thread.id} disabled={thread.isLocked} />
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          <a href="/login" className="underline">Sign in</a> to reply.
        </p>
      )}
    </main>
  );
}
