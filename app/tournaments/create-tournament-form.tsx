"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTournamentAction } from "@/lib/actions/tournaments";

export function CreateTournamentForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);

    const rawName = String(formData.get("name") ?? "").trim();
    const rawDescription = String(formData.get("description") ?? "").trim();
    const rawFormat = String(formData.get("format") ?? "").trim();
    const rawStartsAt = String(formData.get("startsAt") ?? "").trim();

    if (!rawName) {
      setError("Name is required.");
      return;
    }

    startTransition(async () => {
      const r = await createTournamentAction({
        name: rawName,
        description: rawDescription || undefined,
        format: rawFormat || undefined,
        startsAt: rawStartsAt ? rawStartsAt : undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setName("");
      setDescription("");
      setFormat("");
      setStartsAt("");
      router.refresh();
    });
  }

  return (
    <div className="rounded border border-neutral-800 p-4">
      <h2 className="mb-4 font-semibold">Create tournament</h2>
      <form action={handleSubmit} className="flex flex-wrap gap-3 items-end">
        {error && <p className="w-full text-sm text-red-400">{error}</p>}

        <label className="flex flex-col gap-1 text-sm flex-1 min-w-48">
          Name
          <input
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            placeholder="e.g. Spring Invitational…"
            maxLength={200}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm flex-1 min-w-36">
          Format
          <input
            name="format"
            type="text"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={pending}
            placeholder="e.g. Single Elimination…"
            maxLength={100}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Starts at
          <input
            name="startsAt"
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            disabled={pending}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm w-full">
          Description
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
            placeholder="Optional description…"
            maxLength={2000}
            rows={2}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 disabled:opacity-50 resize-none"
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
