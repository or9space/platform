"use client";

import { useState, useTransition } from "react";
import { Trash2, MessageSquare } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";
import { postCommentAction, deleteCommentAction } from "@/lib/actions/comments";
import type { CommentEntity } from "@/lib/comment-entity";
import type { CommentRow } from "@/lib/queries/comments";

interface CommentsProps {
  entityType: CommentEntity;
  entityId: string;
  path: string;
  comments: CommentRow[];
  viewerMembershipId: string;
  canModerate: boolean;
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 2592000) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function Comments({ entityType, entityId, path, comments, viewerMembershipId, canModerate }: CommentsProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePost(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const r = await postCommentAction(entityType, entityId, trimmed, path);
      if (r.ok) {
        setBody("");
      } else {
        setError(r.error);
      }
    });
  }

  function handleDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteCommentAction(commentId, path);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <MfdPanel
      chassis="neutral"
      title={
        <span className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>[ COMMENTS ]</span>
        </span>
      }
      titleAside={<span className="mfd-readout text-sm">{comments.length}</span>}
      bodyPadding="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {comments.length === 0 ? (
          <p className="text-sm text-text-muted">No comments yet. Be the first.</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => {
              const canDelete = comment.authorId === viewerMembershipId || canModerate;
              return (
                <li key={comment.id} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-text-primary">
                        {comment.authorName}
                      </span>
                      <span className="mfd-label">{timeAgo(comment.createdAt)}</span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={isPending}
                        className="text-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
                    {comment.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={handlePost} className="space-y-2 border-t border-border/40 pt-4">
          <span className="mfd-label block">ADD COMMENT</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Write a comment..."
            disabled={isPending}
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">{body.length}/4000</span>
            <button
              type="submit"
              disabled={isPending || !body.trim()}
              className="rounded border border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </MfdPanel>
  );
}
