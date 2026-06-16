"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  editPostAction,
  deletePostAction,
  setThreadPinLockAction,
} from "@/lib/actions/forums";
import type { PostRow } from "@/lib/queries/forums";

interface PostActionsProps {
  threadId: string;
  posts: PostRow[];
  myMembershipId: string | null;
  canModerate: boolean;
  isPinned: boolean;
  isLocked: boolean;
  showThreadControls: boolean;
}

export function PostActions({
  threadId,
  posts,
  myMembershipId,
  canModerate,
  isPinned,
  isLocked,
  showThreadControls,
}: PostActionsProps) {
  const router = useRouter();

  return (
    <div className="space-y-2">
      {showThreadControls && canModerate && (
        <ThreadControls
          threadId={threadId}
          isPinned={isPinned}
          isLocked={isLocked}
          router={router}
        />
      )}
      {posts.map((post) => (
        <PostControls
          key={post.id}
          post={post}
          myMembershipId={myMembershipId}
          canModerate={canModerate}
          router={router}
        />
      ))}
    </div>
  );
}

function ThreadControls({
  threadId,
  isPinned,
  isLocked,
  router,
}: {
  threadId: string;
  isPinned: boolean;
  isLocked: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(patch: { isPinned?: boolean; isLocked?: boolean }) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await setThreadPinLockAction(threadId, patch);
      if (!r.ok) { setError(r.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <p className="text-xs text-fg-red-light">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => toggle({ isPinned: !isPinned })}
        className="rounded border border-border-light px-2 py-1 text-xs disabled:opacity-50 hover:border-primary"
      >
        {isPinned ? "Unpin" : "Pin"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => toggle({ isLocked: !isLocked })}
        className="rounded border border-border-light px-2 py-1 text-xs disabled:opacity-50 hover:border-primary"
      >
        {isLocked ? "Unlock" : "Lock"}
      </button>
    </div>
  );
}

function PostControls({
  post,
  myMembershipId,
  canModerate,
  router,
}: {
  post: PostRow;
  myMembershipId: string | null;
  canModerate: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const isOwner = myMembershipId !== null && post.authorMembershipId === myMembershipId;
  const canEdit = isOwner;
  const canDelete = isOwner || canModerate;

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canEdit && !canDelete) return null;

  function handleEdit(formData: FormData) {
    if (pending) return;
    setError(null);
    const c = String(formData.get("content") ?? "").trim();
    startTransition(async () => {
      const r = await editPostAction(post.id, c);
      if (!r.ok) { setError(r.error); return; }
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await deletePostAction(post.id);
      if (!r.ok) { setError(r.error); return; }
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form action={handleEdit} className="space-y-2">
        {error && <p className="text-xs text-fg-red-light">{error}</p>}
        <textarea
          name="content"
          required
          maxLength={10000}
          rows={3}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full rounded border border-border-light bg-surface p-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-primary px-3 py-1 text-xs font-semibold text-fg-cream disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => { setEditing(false); setEditContent(post.content); }}
            className="rounded border border-border-light px-3 py-1 text-xs disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <p className="text-xs text-fg-red-light">{error}</p>}
      {canEdit && (
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditing(true)}
          className="rounded border border-border-light px-2 py-1 text-xs disabled:opacity-50 hover:border-primary"
        >
          Edit
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          className="rounded border border-border-light px-2 py-1 text-xs disabled:opacity-50 hover:border-primary"
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
      )}
    </div>
  );
}
