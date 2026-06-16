"use client";

import { useState, useTransition } from "react";
import { createNewsAction, updateNewsAction } from "@/lib/actions/news";

const CATEGORIES = ["ANNOUNCEMENT", "PATCH_NOTES", "COMMUNITY", "GUIDE"] as const;
const LABELS: Record<string, string> = {
  ANNOUNCEMENT: "Announcement", PATCH_NOTES: "Patch notes", COMMUNITY: "Community", GUIDE: "Guide",
};

export interface NewsFormInitial {
  title: string;
  body: string;
  category: string;
  isPinned: boolean;
}

export function NewsForm({ postId, initial }: { postId?: string; initial?: NewsFormInitial }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = {
      title: String(fd.get("title") ?? ""),
      body: String(fd.get("body") ?? ""),
      category: String(fd.get("category") ?? "ANNOUNCEMENT"),
      isPinned: fd.get("isPinned") === "on",
    };
    start(async () => {
      const r = postId ? await updateNewsAction(postId, input) : await createNewsAction(input);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      window.location.href = postId ? `/news/${postId}` : "/news";
    });
  }

  const i = initial;
  const field = "mt-1 w-full rounded border border-border-light bg-surface p-2 text-sm";

  return (
    <form action={submit} className="max-w-2xl space-y-4">
      {error && <p className="rounded border border-danger bg-surface p-2 text-sm text-fg-red-light">{error}</p>}
      <label className="block text-sm">
        Title
        <input name="title" required defaultValue={i?.title ?? ""} maxLength={200} className={field} />
      </label>
      <label className="block text-sm">
        Category
        <select name="category" defaultValue={i?.category ?? "ANNOUNCEMENT"} className={field}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{LABELS[c]}</option>)}
        </select>
      </label>
      <label className="block text-sm">
        Body
        <textarea name="body" required rows={10} defaultValue={i?.body ?? ""} maxLength={20000} className={field} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="isPinned" type="checkbox" defaultChecked={i?.isPinned ?? false} />
        Pin to top
      </label>
      <button type="submit" disabled={pending}
        className="rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream disabled:opacity-50">
        {pending ? "Saving…" : postId ? "Save changes" : "Publish"}
      </button>
    </form>
  );
}
