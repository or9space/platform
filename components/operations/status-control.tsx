"use client";

import { useState, useTransition } from "react";
import { setOperationStatusAction, deleteOperationAction } from "@/lib/actions/operations";

const STATUSES = ["PLANNING", "BRIEFING", "ACTIVE", "DEBRIEFING", "COMPLETED", "ARCHIVED"] as const;

export function StatusControl({ operationId, current }: { operationId: string; current: string }) {
  const [status, setStatus] = useState(current);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function change(next: string) {
    if (next === status) return;
    setError(null);
    const prev = status;
    setStatus(next);
    start(async () => {
      const r = await setOperationStatusAction(operationId, next);
      if (!r.ok) { setStatus(prev); setError(r.error); }
    });
  }

  function remove() {
    start(async () => {
      const r = await deleteOperationAction(operationId);
      if (!r.ok) { setError(r.error); return; }
      window.location.href = "/operations";
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(e) => change(e.target.value)}
        disabled={pending}
        className="rounded border border-border-light bg-surface px-2 py-1.5 text-sm"
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
      </select>
      <a href={`/operations/${operationId}/edit`} className="rounded border border-border-light px-3 py-1.5 text-sm hover:border-primary">Edit</a>
      {confirming ? (
        <>
          <button onClick={remove} disabled={pending}
            className="rounded border border-danger bg-surface px-3 py-1.5 text-sm text-red-200 disabled:opacity-50">
            {pending ? "Deleting…" : "Confirm"}
          </button>
          <button onClick={() => setConfirming(false)} className="text-sm text-text-secondary hover:text-text-primary">Cancel</button>
        </>
      ) : (
        <button onClick={() => setConfirming(true)} className="rounded border border-danger px-3 py-1.5 text-sm text-fg-red-light hover:border-danger">Delete</button>
      )}
      {error && <span className="text-sm text-fg-red-light">{error}</span>}
    </div>
  );
}
