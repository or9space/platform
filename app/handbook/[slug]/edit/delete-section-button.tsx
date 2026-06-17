"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSectionAction } from "@/lib/actions/handbook";
import { Trash2 } from "lucide-react";

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
        className="flex items-center gap-1.5 mfd-label rounded border border-border-light px-3 py-1 text-xs text-fg-red-light hover:border-danger disabled:opacity-50 transition-colors"
      >
        <Trash2 className="h-3 w-3" />
        {isPending ? "DELETING…" : "DELETE"}
      </button>
      {error && <p className="text-xs text-fg-red-light">{error}</p>}
    </div>
  );
}
