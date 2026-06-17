"use client";

import { useState, useTransition } from "react";
import {
  createContractAction, deleteContractAction, setContractStatusAction,
  claimContractAction, unclaimContractAction,
} from "@/lib/actions/contracts";

const field = "w-full rounded border border-border bg-surface p-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none";

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
  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="rounded border border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20 mfd-cut-tl-br"
    >
      + New Contract
    </button>
  );
  return (
    <form action={submit} className="space-y-3">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <div>
        <label className="mfd-label mb-1 block">TITLE</label>
        <input name="title" required placeholder="Contract title" maxLength={160} className={field} />
      </div>
      <div>
        <label className="mfd-label mb-1 block">REWARD</label>
        <input name="reward" placeholder="e.g. 50k aUEC (optional)" maxLength={160} className={field} />
      </div>
      <div>
        <label className="mfd-label mb-1 block">DETAILS</label>
        <textarea name="description" rows={3} placeholder="Mission details (optional)" maxLength={5000} className={field} />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-50 mfd-cut-tl-br"
        >
          {pending ? "Saving…" : "Save Contract"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-text-muted hover:text-text-secondary">
          Cancel
        </button>
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
  const btn = "rounded border border-border bg-surface px-2 py-1 text-xs text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50 mfd-cut-tl-br";
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
        <button onClick={() => act(() => deleteContractAction(id), start)} disabled={pending} className="text-xs text-fg-red-light hover:opacity-80 disabled:opacity-50">
          Delete
        </button>
      )}
    </span>
  );
}
