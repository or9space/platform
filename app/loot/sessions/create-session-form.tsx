"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSessionAction } from "@/lib/actions/loot";

export function CreateSessionForm() {
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);

    const rawLabel = String(formData.get("label") ?? "").trim();
    const rawDate = String(formData.get("date") ?? "").trim();
    const rawNotes = String(formData.get("notes") ?? "").trim();

    if (!rawLabel) {
      setError("Label is required.");
      return;
    }
    if (!rawDate) {
      setError("Date is required.");
      return;
    }

    startTransition(async () => {
      const r = await createSessionAction({
        label: rawLabel,
        sessionDate: rawDate,
        notes: rawNotes || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setLabel("");
      setDate("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <div className="rounded border border-neutral-800 p-4">
      <h2 className="mb-4 font-semibold">Create session</h2>
      <form action={handleSubmit} className="flex flex-wrap gap-3 items-end">
        {error && <p className="w-full text-sm text-red-400">{error}</p>}
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-40">
          Label
          <input
            name="label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={pending}
            placeholder="Session name…"
            maxLength={200}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={pending}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-40">
          Notes (optional)
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
          {pending ? "Creating…" : "Create"}
        </button>
      </form>
    </div>
  );
}
