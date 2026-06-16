"use client";

import { useState, useTransition } from "react";
import {
  createContractAction, deleteContractAction, setContractStatusAction,
  claimContractAction, unclaimContractAction,
} from "@/lib/actions/contracts";

const field = "w-full rounded border border-border-light bg-surface p-2 text-sm";

export function ContractCreateForm() {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = { title: String(fd.get("title") ?? ""), reward: String(fd.get("reward") ?? "") || null, description: String(fd.get("description") ?? "") || null };
    start(async () => { const r = await createContractAction(input); if (!r.ok) { setError(r.error); return; } window.location.reload(); });
  }
  if (!open) return <button onClick={() => setOpen(true)} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream">New contract</button>;
  return (
    <form action={submit} className="space-y-2 rounded border border-border p-4">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <input name="title" required placeholder="Title" maxLength={160} className={field} />
      <input name="reward" placeholder="Reward (optional, e.g. 50k aUEC)" maxLength={160} className={field} />
      <textarea name="description" rows={3} placeholder="Details (optional)" maxLength={5000} className={field} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-text-secondary hover:text-text-primary">Cancel</button>
      </div>
    </form>
  );
}

function act(fn: () => Promise<{ ok: boolean }>, start: ReturnType<typeof useTransition>[1]) {
  start(async () => { const r = await fn(); if (r.ok) window.location.reload(); });
}

export function ContractActions({
  id, status, canManage, isClaimant, canClaim,
}: { id: string; status: string; canManage: boolean; isClaimant: boolean; canClaim: boolean }) {
  const [pending, start] = useTransition();
  const btn = "rounded border border-border-light px-2 py-1 text-xs hover:border-primary disabled:opacity-50";
  return (
    <span className="flex flex-wrap items-center gap-2">
      {status === "OPEN" && canClaim && (
        <button onClick={() => act(() => claimContractAction(id), start)} disabled={pending} className={btn}>Claim</button>
      )}
      {status === "CLAIMED" && (isClaimant || canManage) && (
        <button onClick={() => act(() => unclaimContractAction(id), start)} disabled={pending} className={btn}>Release</button>
      )}
      {canManage && status !== "COMPLETED" && (
        <button onClick={() => act(() => setContractStatusAction(id, "COMPLETED"), start)} disabled={pending} className={btn}>Complete</button>
      )}
      {canManage && status !== "CANCELLED" && (
        <button onClick={() => act(() => setContractStatusAction(id, "CANCELLED"), start)} disabled={pending} className={btn}>Cancel</button>
      )}
      {canManage && (
        <button onClick={() => act(() => deleteContractAction(id), start)} disabled={pending} className="text-xs text-fg-red-light hover:text-fg-red-light disabled:opacity-50">Delete</button>
      )}
    </span>
  );
}
