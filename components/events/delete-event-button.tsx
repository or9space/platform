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
        className="rounded border border-danger px-3 py-1.5 text-sm text-fg-red-light hover:border-danger"
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
        className="rounded border border-danger bg-surface px-3 py-1.5 text-sm text-fg-red-light disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Confirm delete"}
      </button>
      <button onClick={() => setConfirming(false)} className="text-sm text-text-secondary hover:text-text-primary">
        Cancel
      </button>
      {error && <span className="text-sm text-fg-red-light">{error}</span>}
    </span>
  );
}
