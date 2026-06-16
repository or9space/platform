"use client";

import { useState, useTransition } from "react";
import { deleteItemAction } from "@/lib/actions/inventory";

interface DeleteItemButtonProps {
  itemId: string;
}

export function DeleteItemButton({ itemId }: DeleteItemButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (pending) return;
    const confirmed = window.confirm(
      "Delete this item and all its holdings? This cannot be undone.",
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const r = await deleteItemAction(itemId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      window.location.href = "/inventory";
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1 shrink-0">
      <button
        onClick={handleDelete}
        disabled={pending}
        className="rounded border border-border-light px-3 py-1.5 text-sm text-fg-red-light hover:border-danger hover:text-fg-red-light disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete item"}
      </button>
      {error && <span className="text-xs text-fg-red-light">{error}</span>}
    </span>
  );
}
