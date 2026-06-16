"use client";

import { useState, useTransition } from "react";
import { createResourceAction, deleteResourceAction } from "@/lib/actions/resources";

const field = "w-full rounded border border-border-light bg-surface p-2 text-sm";

export function ResourceCreateForm() {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = {
      title: String(fd.get("title") ?? ""),
      url: String(fd.get("url") ?? "") || null,
      category: String(fd.get("category") ?? "") || null,
      body: String(fd.get("body") ?? "") || null,
    };
    start(async () => {
      const r = await createResourceAction(input);
      if (!r.ok) { setError(r.error); return; }
      window.location.reload();
    });
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream">Add resource</button>;
  }
  return (
    <form action={submit} className="space-y-2 rounded border border-border p-4">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <input name="title" required placeholder="Title" maxLength={160} className={field} />
      <input name="url" placeholder="URL (optional)" maxLength={500} className={field} />
      <input name="category" placeholder="Category (optional)" maxLength={60} className={field} />
      <textarea name="body" rows={3} placeholder="Notes (optional)" maxLength={10000} className={field} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-text-secondary hover:text-text-primary">Cancel</button>
      </div>
    </form>
  );
}

export function DeleteResourceButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { const r = await deleteResourceAction(id); if (r.ok) window.location.reload(); })}
      disabled={pending}
      className="text-xs text-fg-red-light hover:text-fg-red-light disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
