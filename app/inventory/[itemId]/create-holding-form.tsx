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
    <div className="rounded border border-neutral-800 p-4">
      <h2 className="mb-4 font-semibold">Add holding</h2>
      <form action={handleSubmit} className="flex flex-wrap gap-3 items-end">
        {error && <p className="w-full text-sm text-red-400">{error}</p>}
        <label className="flex flex-col gap-1 text-sm">
          Quantity
          <input
            name="quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={pending}
            className="w-24 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          State
          <select
            name="state"
            value={state}
            onChange={(e) => setState(e.target.value as HoldingState)}
            disabled={pending}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 disabled:opacity-50"
          >
            {HOLDING_STATES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-48">
          Notes
          <input
            name="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
            placeholder="Optional notes…"
            maxLength={500}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
    </div>
  );
}
