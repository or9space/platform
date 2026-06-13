"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createThreadAction } from "@/lib/actions/forums";

export function NewThreadForm({ categoryId }: { categoryId: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    const t = String(formData.get("title") ?? "").trim();
    const c = String(formData.get("content") ?? "").trim();
    startTransition(async () => {
      const r = await createThreadAction({ categoryId, title: t, content: c });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setTitle("");
      setContent("");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <label className="block text-sm">
        Title
        <input
          name="title"
          required
          maxLength={300}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2"
        />
      </label>
      <label className="block text-sm">
        Content
        <textarea
          name="content"
          required
          maxLength={10000}
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50"
      >
        {pending ? "Posting…" : "Post thread"}
      </button>
    </form>
  );
}
