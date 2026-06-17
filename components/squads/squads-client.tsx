"use client";

import { useState, useTransition } from "react";
import { createSquadAction, deleteSquadAction, addSquadMemberAction, removeSquadMemberAction } from "@/lib/actions/squads";

const field = "w-full rounded border border-border-light bg-surface p-2 text-sm";

export function SquadCreateForm() {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = { name: String(fd.get("name") ?? ""), description: String(fd.get("description") ?? "") || null };
    start(async () => { const r = await createSquadAction(input); if (!r.ok) { setError(r.error); return; } window.location.reload(); });
  }
  if (!open) return <button onClick={() => setOpen(true)} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream">New squad</button>;
  return (
    <form action={submit} className="space-y-2">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <input name="name" required placeholder="Squad name" maxLength={120} className={field} />
      <textarea name="description" rows={2} placeholder="Description (optional)" maxLength={2000} className={field} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-text-secondary hover:text-text-primary">Cancel</button>
      </div>
    </form>
  );
}

export function AddMemberForm({ squadId }: { squadId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = { squadId, username: String(fd.get("username") ?? ""), role: String(fd.get("role") ?? "") || null };
    start(async () => { const r = await addSquadMemberAction(input); if (!r.ok) { setError(r.error); return; } window.location.reload(); });
  }
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs text-text-secondary hover:text-text-primary">+ Add member</button>;
  return (
    <form action={submit} className="mt-2 flex flex-wrap items-center gap-2">
      <input name="username" required placeholder="username" maxLength={60} className="w-32 rounded border border-border-light bg-surface px-2 py-1 text-xs" />
      <input name="role" placeholder="role (optional)" maxLength={80} className="w-32 rounded border border-border-light bg-surface px-2 py-1 text-xs" />
      <button type="submit" disabled={pending} className="rounded bg-primary px-2 py-1 text-xs font-semibold text-fg-cream disabled:opacity-50">{pending ? "…" : "Add"}</button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-text-secondary">Cancel</button>
      {error && <span className="text-xs text-fg-red-light">{error}</span>}
    </form>
  );
}

export function DeleteSquadButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button onClick={() => start(async () => { const r = await deleteSquadAction(id); if (r.ok) window.location.reload(); })} disabled={pending} className="text-xs text-fg-red-light hover:text-fg-red-light disabled:opacity-50">{pending ? "…" : "Delete"}</button>;
}

export function RemoveMemberButton({ squadId, membershipId }: { squadId: string; membershipId: string }) {
  const [pending, start] = useTransition();
  return <button onClick={() => start(async () => { const r = await removeSquadMemberAction(squadId, membershipId); if (r.ok) window.location.reload(); })} disabled={pending} className="text-xs text-text-muted hover:text-fg-red-light disabled:opacity-50" title="Remove">×</button>;
}
