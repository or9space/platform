"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHoldingAction } from "@/lib/actions/inventory";
import { HOLDING_STATES } from "@/lib/inventory";
import type { HoldingState } from "@/lib/inventory";

interface CreateHoldingFormProps {
  itemId: string;
}

export function CreateHoldingForm({ itemId }: CreateHoldingFormProps) {
  const [quantity, setQuantity] = useState("1");
  const [state, setState] = useState<HoldingState>("ACTIVE");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);

    const rawQty = Number(formData.get("quantity"));
    const rawState = String(formData.get("state")) as HoldingState;
    const rawNotes = String(formData.get("notes") ?? "").trim();

    if (!rawQty || rawQty < 1 || !Number.isInteger(rawQty)) {
      setError("Quantity must be a whole number of at least 1.");
      return;
    }

    startTransition(async () => {
      const r = await createHoldingAction({
        itemId,
        quantity: rawQty,
        state: rawState,
        notes: rawNotes || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setQuantity("1");
      setState("ACTIVE");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap gap-3 items-end">
      {error && <p className="w-full text-xs text-fg-red-light mfd-label">{error}</p>}
      <label className="flex flex-col gap-1">
        <span className="mfd-label text-text-muted">Quantity</span>
        <input
          name="quantity"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={pending}
          className="w-24 border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none disabled:opacity-50"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="mfd-label text-text-muted">State</span>
        <select
          name="state"
          value={state}
          onChange={(e) => setState(e.target.value as HoldingState)}
          disabled={pending}
          className="border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none disabled:opacity-50"
        >
          {HOLDING_STATES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 flex-1 min-w-48">
        <span className="mfd-label text-text-muted">Notes</span>
        <input
          name="notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={pending}
          placeholder="Optional notes…"
          maxLength={500}
          className="border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none disabled:opacity-50"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="border border-primary bg-primary/10 px-4 py-2 text-xs mfd-label text-primary hover:bg-primary/20 disabled:opacity-50"
      >
        {pending ? "ADDING…" : "ADD HOLDING"}
      </button>
    </form>
  );
}
