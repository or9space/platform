"use client";

import { useState, useTransition } from "react";
import { createGalleryAction, deleteGalleryAction } from "@/lib/actions/gallery";

const field = "w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-sm";

export function GalleryUploadForm() {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = { imageUrl: String(fd.get("imageUrl") ?? ""), title: String(fd.get("title") ?? "") || null, caption: String(fd.get("caption") ?? "") || null };
    start(async () => { const r = await createGalleryAction(input); if (!r.ok) { setError(r.error); return; } window.location.reload(); });
  }
  if (!open) return <button onClick={() => setOpen(true)} className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900">Add image</button>;
  return (
    <form action={submit} className="space-y-2 rounded border border-neutral-800 p-4">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <input name="imageUrl" required placeholder="Image URL (https://…)" maxLength={1000} className={field} />
      <input name="title" placeholder="Title (optional)" maxLength={160} className={field} />
      <textarea name="caption" rows={2} placeholder="Caption (optional)" maxLength={2000} className={field} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-neutral-400 hover:text-neutral-200">Cancel</button>
      </div>
    </form>
  );
}

export function DeleteGalleryButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button onClick={() => start(async () => { const r = await deleteGalleryAction(id); if (r.ok) window.location.reload(); })}
      disabled={pending} className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50">
      {pending ? "…" : "Delete"}
    </button>
  );
}
