"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteShipAction } from "@/lib/actions/fleet";

interface ModerateDeleteButtonProps {
  shipId: string;
  shipName: string;
}

export function ModerateDeleteButton({ shipId, shipName }: ModerateDeleteButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`Remove "${shipName}" from the org fleet? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteShipAction(shipId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span>
      {error && <span className="mr-2 text-xs text-fg-red-light">{error}</span>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="rounded border border-danger px-2 py-0.5 text-xs text-fg-red-light hover:border-danger disabled:opacity-50"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
    </span>
  );
}
