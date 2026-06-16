"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPostAction } from "@/lib/actions/forums";

export function ReplyForm({
  threadId,
  disabled,
}: {
  threadId: string;
  disabled: boolean;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (disabled) {
    return <p className="text-sm text-text-muted">This thread is locked.</p>;
  }

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    const c = String(formData.get("content") ?? "").trim();
    startTransition(async () => {
      const r = await createPostAction({ threadId, content: c });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setContent("");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <textarea
        name="content"
        required
        maxLength={10000}
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded border border-border-light bg-surface p-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream disabled:opacity-50"
      >
        {pending ? "Posting…" : "Post reply"}
      </button>
    </form>
  );
}
