"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transferLootAction } from "@/lib/actions/loot";

export function TransferForm({ toMemberId }: { toMemberId: string }) {
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);

    const rawPoints = String(formData.get("points") ?? "").trim();
    const rawNote = String(formData.get("note") ?? "").trim();
    const parsed = parseFloat(rawPoints);

    if (!rawPoints || isNaN(parsed) || parsed <= 0) {
      setError("Enter a positive number of points to transfer.");
      return;
    }

    const amountTenths = Math.round(parsed * 10);

    startTransition(async () => {
      const r = await transferLootAction({
        toMemberId,
        amountTenths,
        note: rawNote || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setPoints("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="rounded border border-neutral-800 p-4">
      <h3 className="mb-3 font-semibold text-sm text-neutral-300">Transfer points to this member</h3>
      <form action={handleSubmit} className="flex flex-wrap gap-3 items-end">
        {error && <p className="w-full text-sm text-red-400">{error}</p>}
        <label className="flex flex-col gap-1 text-sm">
          Points
          <input
            name="points"
            type="number"
            min="0.1"
            step="0.1"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            disabled={pending}
            placeholder="0.0"
            className="w-28 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-40">
          Note (optional)
          <input
            name="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={pending}
            placeholder="Message…"
            maxLength={500}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50"
        >
          {pending ? "Transferring…" : "Transfer"}
        </button>
      </form>
    </div>
  );
}
