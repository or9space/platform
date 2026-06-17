"use client";

import { useState, useTransition } from "react";
import { createAllianceAction, deleteAllianceAction } from "@/lib/actions/alliances";

const STATUSES = ["ALLY", "NEUTRAL", "HOSTILE", "PENDING"] as const;
const field =
  "w-full border border-border bg-surface px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none";

export function AllianceCreateForm() {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = {
      name: String(fd.get("name") ?? ""),
      status: String(fd.get("status") ?? "ALLY"),
      link: String(fd.get("link") ?? "") || null,
      description: String(fd.get("description") ?? "") || null,
    };
    start(async () => {
      const r = await createAllianceAction(input);
      if (!r.ok) { setError(r.error); return; }
      window.location.reload();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="border border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20 mfd-cut-tl-br"
      >
        + Add alliance
      </button>
    );
  }

  return (
    <form action={submit} className="space-y-2">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <div className="space-y-0.5">
        <label className="mfd-label block">ORG NAME</label>
        <input name="name" required placeholder="Organization name" maxLength={120} className={field} />
      </div>
      <div className="space-y-0.5">
        <label className="mfd-label block">STATUS</label>
        <select name="status" defaultValue="ALLY" className={field}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>
      <div className="space-y-0.5">
        <label className="mfd-label block">LINK</label>
        <input name="link" placeholder="URL (optional)" maxLength={500} className={field} />
      </div>
      <div className="space-y-0.5">
        <label className="mfd-label block">NOTES</label>
        <textarea name="description" rows={2} placeholder="Notes (optional)" maxLength={5000} className={field} />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="border border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-50 mfd-cut-tl-br"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function DeleteAllianceButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          const r = await deleteAllianceAction(id);
          if (r.ok) window.location.reload();
        })
      }
      disabled={pending}
      className="shrink-0 text-xs text-fg-red-light hover:text-fg-red-light disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
