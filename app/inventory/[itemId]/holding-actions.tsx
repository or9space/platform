"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHoldingAction, deleteHoldingAction } from "@/lib/actions/inventory";
import { HOLDING_STATES } from "@/lib/inventory";
import type { HoldingState } from "@/lib/inventory";

interface HoldingActionsProps {
  holdingId: string;
  quantity: number;
  state: HoldingState;
  notes: string | null;
}

export function HoldingActions({ holdingId, quantity, state, notes }: HoldingActionsProps) {
  const [editing, setEditing] = useState(false);
  const [editQty, setEditQty] = useState(String(quantity));
  const [editState, setEditState] = useState<HoldingState>(state);
  const [editNotes, setEditNotes] = useState(notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function openEdit() {
    setEditQty(String(quantity));
    setEditState(state);
    setEditNotes(notes ?? "");
    setError(null);
    setEditing(true);
  }

  function handleSave() {
    if (pending) return;
    setError(null);

    const rawQty = Number(editQty);
    if (!rawQty || rawQty < 1 || !Number.isInteger(rawQty)) {
      setError("Quantity must be a whole number of at least 1.");
      return;
    }

    startTransition(async () => {
      const r = await updateHoldingAction(holdingId, {
        quantity: rawQty,
        state: editState,
        notes: editNotes.trim() || null,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (pending) return;
    const confirmed = window.confirm("Delete this holding? This cannot be undone.");
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const r = await deleteHoldingAction(holdingId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  if (editing) {
    return (
      <span className="inline-flex flex-col gap-2 min-w-56">
        {error && <span className="mfd-label text-xs text-fg-red-light">{error}</span>}
        <span className="flex flex-wrap gap-2 items-end">
          <label className="flex flex-col gap-1">
            <span className="mfd-label text-text-muted">Qty</span>
            <input
              type="number"
              min="1"
              step="1"
              value={editQty}
              onChange={(e) => setEditQty(e.target.value)}
              disabled={pending}
              className="w-20 border border-border bg-surface px-2 py-1 text-sm text-text-primary focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="mfd-label text-text-muted">State</span>
            <select
              value={editState}
              onChange={(e) => setEditState(e.target.value as HoldingState)}
              disabled={pending}
              className="border border-border bg-surface px-2 py-1 text-sm text-text-primary focus:border-primary focus:outline-none disabled:opacity-50"
            >
              {HOLDING_STATES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-32">
            <span className="mfd-label text-text-muted">Notes</span>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              disabled={pending}
              maxLength={500}
              className="border border-border bg-surface px-2 py-1 text-sm text-text-primary focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </label>
        </span>
        <span className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={pending}
            className="border border-primary bg-primary/10 px-2 py-1 text-xs mfd-label text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {pending ? "SAVING…" : "SAVE"}
          </button>
          <button
            onClick={() => { setEditing(false); setError(null); }}
            disabled={pending}
            className="border border-border px-2 py-1 text-xs mfd-label text-text-secondary hover:border-primary disabled:opacity-50"
          >
            CANCEL
          </button>
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className="flex gap-2">
        <button
          onClick={openEdit}
          disabled={pending}
          className="border border-border px-2 py-1 text-xs mfd-label text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50"
        >
          EDIT
        </button>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="border border-border px-2 py-1 text-xs mfd-label text-fg-red-light hover:border-danger hover:bg-danger/20 disabled:opacity-50"
        >
          {pending ? "DELETING…" : "DELETE"}
        </button>
      </span>
      {error && <span className="mfd-label text-xs text-fg-red-light">{error}</span>}
    </span>
  );
}
