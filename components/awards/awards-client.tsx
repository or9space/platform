"use client";

import { useState, useTransition } from "react";
import { createAwardAction, deleteAwardAction, grantAwardAction, revokeAwardAction } from "@/lib/actions/awards";

const field = "w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary";

const AWARD_KIND_OPTIONS = [
  { value: "MEDAL",        label: "Medal" },
  { value: "RIBBON",       label: "Ribbon" },
  { value: "COMMENDATION", label: "Commendation" },
  { value: "TROPHY",       label: "Trophy" },
  { value: "BADGE",        label: "Badge" },
] as const;

export function AwardCreateForm() {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = {
      name: String(fd.get("name") ?? ""),
      description: String(fd.get("description") ?? "") || null,
      kind: String(fd.get("kind") ?? "MEDAL") as "MEDAL" | "RIBBON" | "COMMENDATION" | "TROPHY" | "BADGE",
      icon: String(fd.get("icon") ?? "") || null,
    };
    start(async () => {
      const r = await createAwardAction(input);
      if (!r.ok) { setError(r.error); return; }
      window.location.reload();
    });
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="rounded border border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20"
    >
      + New Award
    </button>
  );

  return (
    <form action={submit} className="space-y-3">
      {error && <p className="mfd-label text-fg-red-light">{error}</p>}
      <div className="space-y-1">
        <label className="mfd-label">AWARD NAME</label>
        <input name="name" required placeholder="Award name" maxLength={120} className={field} />
      </div>
      <div className="space-y-1">
        <label className="mfd-label">KIND</label>
        <select name="kind" defaultValue="MEDAL" className={field}>
          {AWARD_KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="mfd-label">DESCRIPTION</label>
        <textarea name="description" rows={2} placeholder="Description (optional)" maxLength={2000} className={field} />
      </div>
      <div className="space-y-1">
        <label className="mfd-label">ICON (optional, lucide name)</label>
        <input name="icon" placeholder="e.g. shield, star" maxLength={60} className={field} />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-text-muted hover:text-text-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function GrantForm({ awardId }: { awardId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = { awardId, username: String(fd.get("username") ?? ""), note: String(fd.get("note") ?? "") || null };
    start(async () => {
      const r = await grantAwardAction(input);
      if (!r.ok) { setError(r.error); return; }
      window.location.reload();
    });
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="mfd-label text-text-muted hover:text-primary"
    >
      + GRANT
    </button>
  );

  return (
    <form action={submit} className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
      <input
        name="username"
        required
        placeholder="username"
        maxLength={60}
        className="w-32 rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
      />
      <input
        name="note"
        placeholder="note (optional)"
        maxLength={300}
        className="w-40 rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-primary bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
      >
        {pending ? "…" : "Grant"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="mfd-label text-text-muted hover:text-text-secondary">
        Cancel
      </button>
      {error && <span className="mfd-label text-fg-red-light">{error}</span>}
    </form>
  );
}

export function DeleteAwardButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { const r = await deleteAwardAction(id); if (r.ok) window.location.reload(); })}
      disabled={pending}
      className="mfd-label text-text-muted hover:text-fg-red-light disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

export function RevokeButton({ awardId, membershipId }: { awardId: string; membershipId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { const r = await revokeAwardAction(awardId, membershipId); if (r.ok) window.location.reload(); })}
      disabled={pending}
      className="ml-0.5 text-text-muted hover:text-fg-red-light disabled:opacity-50"
      title="Revoke"
    >
      ×
    </button>
  );
}
