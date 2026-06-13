"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTreasuryEntryAction } from "@/lib/actions/treasury";

interface EntryActionsProps {
  entryId: string;
}

export function EntryActions({ entryId }: EntryActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (pending) return;
    const confirmed = window.confirm("Delete this entry? This cannot be undone.");
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const r = await deleteTreasuryEntryAction(entryId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        onClick={handleDelete}
        disabled={pending}
        className="rounded border border-neutral-700 px-2 py-1 text-xs text-red-400 hover:border-red-700 hover:text-red-300 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}
