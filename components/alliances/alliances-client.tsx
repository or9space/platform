"use client";

import { useState, useTransition } from "react";
import { createAllianceAction, deleteAllianceAction } from "@/lib/actions/alliances";

const STATUSES = ["ALLY", "NEUTRAL", "HOSTILE", "PENDING"] as const;
const field = "w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-sm";

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
    return <button onClick={() => setOpen(true)} className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900">Add alliance</button>;
  }
  return (
    <form action={submit} className="space-y-2 rounded border border-neutral-800 p-4">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <input name="name" required placeholder="Org name" maxLength={120} className={field} />
      <select name="status" defaultValue="ALLY" className={field}>
        {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
      </select>
      <input name="link" placeholder="Link (optional)" maxLength={500} className={field} />
      <textarea name="description" rows={2} placeholder="Notes (optional)" maxLength={5000} className={field} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-neutral-400 hover:text-neutral-200">Cancel</button>
      </div>
    </form>
  );
}

export function DeleteAllianceButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { const r = await deleteAllianceAction(id); if (r.ok) window.location.reload(); })}
      disabled={pending}
      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
