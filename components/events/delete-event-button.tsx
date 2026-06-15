"use client";

import { useState, useTransition } from "react";
import { deleteEventAction } from "@/lib/actions/events";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove() {
    start(async () => {
      const r = await deleteEventAction(eventId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      window.location.href = "/events";
    });
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded border border-red-900 px-3 py-1.5 text-sm text-red-400 hover:border-red-700"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={remove}
        disabled={pending}
        className="rounded border border-red-700 bg-red-950 px-3 py-1.5 text-sm text-red-200 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Confirm delete"}
      </button>
      <button onClick={() => setConfirming(false)} className="text-sm text-neutral-400 hover:text-neutral-200">
        Cancel
      </button>
      {error && <span className="text-sm text-red-400">{error}</span>}
    </span>
  );
}
