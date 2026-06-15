"use client";

import { useState, useTransition } from "react";
import { createLfgAction, closeLfgAction, deleteLfgAction } from "@/lib/actions/lfg";

const field = "w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-sm";

export function LfgCreateForm() {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = { title: String(fd.get("title") ?? ""), body: String(fd.get("body") ?? "") || null };
    start(async () => {
      const r = await createLfgAction(input);
      if (!r.ok) { setError(r.error); return; }
      window.location.reload();
    });
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900">Post LFG</button>;
  }
  return (
    <form action={submit} className="space-y-2 rounded border border-neutral-800 p-4">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <input name="title" required placeholder="What are you looking for?" maxLength={160} className={field} />
      <textarea name="body" rows={3} placeholder="Details (optional)" maxLength={5000} className={field} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900 disabled:opacity-50">{pending ? "Posting…" : "Post"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-neutral-400 hover:text-neutral-200">Cancel</button>
      </div>
    </form>
  );
}

export function LfgRowActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <span className="flex items-center gap-3">
      {status === "OPEN" && (
        <button onClick={() => start(async () => { const r = await closeLfgAction(id); if (r.ok) window.location.reload(); })}
          disabled={pending} className="text-xs text-neutral-400 hover:text-neutral-200 disabled:opacity-50">Close</button>
      )}
      <button onClick={() => start(async () => { const r = await deleteLfgAction(id); if (r.ok) window.location.reload(); })}
        disabled={pending} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">Delete</button>
    </span>
  );
}
