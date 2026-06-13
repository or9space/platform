"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSectionAction } from "@/lib/actions/handbook";

interface Props {
  sectionId: string;
}

export function DeleteSectionButton({ sectionId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("Delete this section? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSectionAction(sectionId);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded border border-neutral-700 px-3 py-1 text-xs text-red-400 hover:border-red-800 hover:text-red-300 disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
