"use client";

import { useState, useTransition } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { createResourceAction, deleteResourceAction } from "@/lib/actions/resources";

const field =
  "w-full border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary/60 focus:outline-none transition-colors";

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
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary hover:border-primary/60 hover:bg-surface-elevated hover:text-primary transition-colors mfd-cut-tl-br"
      >
        <Plus className="h-3.5 w-3.5" /> Add resource
      </button>
    );
  }

  return (
    <div className="border border-border bg-surface mfd-cut-tl-br">
      {/* Form header */}
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <span className="mfd-label flex items-center gap-1.5">
          <Plus className="h-3 w-3" /> [ NEW RESOURCE ]
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <form action={submit} className="space-y-3 px-4 py-3">
        {error && (
          <p className="border border-fg-red-light/30 bg-fg-red-light/10 px-3 py-2 text-xs text-fg-red-light">
            {error}
          </p>
        )}
        <div className="space-y-1">
          <label className="mfd-label block">Title</label>
          <input name="title" required placeholder="e.g. Ship fitting guide" maxLength={160} className={field} />
        </div>
        <div className="space-y-1">
          <label className="mfd-label block">URL <span className="text-text-muted">(optional)</span></label>
          <input name="url" placeholder="https://…" maxLength={500} className={field} />
        </div>
        <div className="space-y-1">
          <label className="mfd-label block">Category <span className="text-text-muted">(optional)</span></label>
          <input name="category" placeholder="e.g. Guide, Build, Lore" maxLength={60} className={field} />
        </div>
        <div className="space-y-1">
          <label className="mfd-label block">Notes <span className="text-text-muted">(optional)</span></label>
          <textarea name="body" rows={3} placeholder="Additional context…" maxLength={10000} className={field} />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors mfd-cut-tl-br"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export function DeleteResourceButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { const r = await deleteResourceAction(id); if (r.ok) window.location.reload(); })}
      disabled={pending}
      className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-fg-red-light disabled:opacity-50 transition-colors"
      title="Delete resource"
    >
      <Trash2 className="h-3.5 w-3.5" />
      <span className="sr-only">{pending ? "Deleting…" : "Delete"}</span>
    </button>
  );
}
