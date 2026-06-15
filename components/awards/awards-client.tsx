"use client";

import { useState, useTransition } from "react";
import { createAwardAction, deleteAwardAction, grantAwardAction, revokeAwardAction } from "@/lib/actions/awards";

const field = "w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-sm";

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
  if (!open) return <button onClick={() => setOpen(true)} className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900">New award</button>;
  return (
    <form action={submit} className="space-y-2 rounded border border-neutral-800 p-4">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <input name="name" required placeholder="Award name" maxLength={120} className={field} />
      <textarea name="description" rows={2} placeholder="Description (optional)" maxLength={2000} className={field} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-neutral-400 hover:text-neutral-200">Cancel</button>
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
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs text-neutral-400 hover:text-neutral-200">+ Grant</button>;
  return (
    <form action={submit} className="mt-2 flex flex-wrap items-center gap-2">
      <input name="username" required placeholder="username" maxLength={60} className="w-32 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs" />
      <input name="note" placeholder="note (optional)" maxLength={300} className="w-40 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs" />
      <button type="submit" disabled={pending} className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-900 disabled:opacity-50">{pending ? "…" : "Grant"}</button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-400">Cancel</button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </form>
  );
}

export function DeleteAwardButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button onClick={() => start(async () => { const r = await deleteAwardAction(id); if (r.ok) window.location.reload(); })} disabled={pending} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">{pending ? "…" : "Delete"}</button>;
}

export function RevokeButton({ awardId, membershipId }: { awardId: string; membershipId: string }) {
  const [pending, start] = useTransition();
  return <button onClick={() => start(async () => { const r = await revokeAwardAction(awardId, membershipId); if (r.ok) window.location.reload(); })} disabled={pending} className="text-xs text-neutral-600 hover:text-red-400 disabled:opacity-50" title="Revoke">×</button>;
}
