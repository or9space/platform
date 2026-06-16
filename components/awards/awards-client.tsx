"use client";

import { useState, useTransition } from "react";
import { createAwardAction, deleteAwardAction, grantAwardAction, revokeAwardAction } from "@/lib/actions/awards";

const field = "w-full rounded border border-border-light bg-surface p-2 text-sm";

export function AwardCreateForm() {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = { name: String(fd.get("name") ?? ""), description: String(fd.get("description") ?? "") || null };
    start(async () => {
      const r = await createAwardAction(input);
      if (!r.ok) { setError(r.error); return; }
      window.location.reload();
    });
  }
  if (!open) return <button onClick={() => setOpen(true)} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream">New award</button>;
  return (
    <form action={submit} className="space-y-2 rounded border border-border p-4">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <input name="name" required placeholder="Award name" maxLength={120} className={field} />
      <textarea name="description" rows={2} placeholder="Description (optional)" maxLength={2000} className={field} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-text-secondary hover:text-text-primary">Cancel</button>
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
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs text-text-secondary hover:text-text-primary">+ Grant</button>;
  return (
    <form action={submit} className="mt-2 flex flex-wrap items-center gap-2">
      <input name="username" required placeholder="username" maxLength={60} className="w-32 rounded border border-border-light bg-surface px-2 py-1 text-xs" />
      <input name="note" placeholder="note (optional)" maxLength={300} className="w-40 rounded border border-border-light bg-surface px-2 py-1 text-xs" />
      <button type="submit" disabled={pending} className="rounded bg-primary px-2 py-1 text-xs font-semibold text-fg-cream disabled:opacity-50">{pending ? "…" : "Grant"}</button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-text-secondary">Cancel</button>
      {error && <span className="text-xs text-fg-red-light">{error}</span>}
    </form>
  );
}

export function DeleteAwardButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button onClick={() => start(async () => { const r = await deleteAwardAction(id); if (r.ok) window.location.reload(); })} disabled={pending} className="text-xs text-fg-red-light hover:text-fg-red-light disabled:opacity-50">{pending ? "…" : "Delete"}</button>;
}

export function RevokeButton({ awardId, membershipId }: { awardId: string; membershipId: string }) {
  const [pending, start] = useTransition();
  return <button onClick={() => start(async () => { const r = await revokeAwardAction(awardId, membershipId); if (r.ok) window.location.reload(); })} disabled={pending} className="text-xs text-text-muted hover:text-fg-red-light disabled:opacity-50" title="Revoke">×</button>;
}
