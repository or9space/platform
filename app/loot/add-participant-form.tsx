"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLootMemberAction } from "@/lib/actions/loot";

export function AddParticipantForm() {
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);

    const name = String(formData.get("displayName") ?? "").trim();
    if (!name) {
      setError("Display name is required.");
      return;
    }

    startTransition(async () => {
      const r = await createLootMemberAction({ displayName: name });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDisplayName("");
      router.refresh();
    });
  }

  return (
    <div className="rounded border border-neutral-800 p-4">
      <h2 className="mb-4 font-semibold">Add participant</h2>
      <form action={handleSubmit} className="flex flex-wrap gap-3 items-end">
        {error && <p className="w-full text-sm text-red-400">{error}</p>}
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-48">
          Display name
          <input
            name="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={pending}
            placeholder="Handle or callsign…"
            maxLength={100}
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
