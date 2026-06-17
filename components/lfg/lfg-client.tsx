"use client";

import { useState, useTransition } from "react";
import { createLfgAction, closeLfgAction, deleteLfgAction } from "@/lib/actions/lfg";
import { MfdPanel } from "@/components/ui/mfd";

const field = "w-full border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none";

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
    return (
      <button
        onClick={() => setOpen(true)}
        className="border border-primary bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mfd-cut-tl-br hover:bg-primary/20 transition-colors"
      >
        + POST LFG
      </button>
    );
  }
  return (
    <MfdPanel title={<span>[ NEW POST ]</span>} chassis="primary" bodyPadding="md">
      <form action={submit} className="space-y-3">
        {error && <p className="mfd-label text-sm text-amber">{error}</p>}
        <div className="space-y-1">
          <label className="mfd-label block">TITLE</label>
          <input name="title" required placeholder="What are you looking for?" maxLength={160} className={field} />
        </div>
        <div className="space-y-1">
          <label className="mfd-label block">DETAILS</label>
          <textarea name="body" rows={3} placeholder="Optional" maxLength={5000} className={field} />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="border border-primary bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mfd-cut-tl-br hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {pending ? "POSTING…" : "POST"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mfd-label text-sm hover:text-text-primary transition-colors"
          >
            CANCEL
          </button>
        </div>
      </form>
    </MfdPanel>
  );
}

export function LfgRowActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <span className="flex items-center gap-3 shrink-0">
      {status === "OPEN" && (
        <button
          onClick={() => start(async () => { const r = await closeLfgAction(id); if (r.ok) window.location.reload(); })}
          disabled={pending}
          className="mfd-label text-xs hover:text-text-primary disabled:opacity-50 transition-colors"
        >
          CLOSE
        </button>
      )}
      <button
        onClick={() => start(async () => { const r = await deleteLfgAction(id); if (r.ok) window.location.reload(); })}
        disabled={pending}
        className="mfd-label text-xs text-amber hover:text-text-primary disabled:opacity-50 transition-colors"
      >
        DELETE
      </button>
    </span>
  );
}
