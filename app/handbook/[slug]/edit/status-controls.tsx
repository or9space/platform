"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { setHandbookStatusAction } from "@/lib/actions/handbook";

interface Props {
  handbookId: string;
  currentStatus: string;
}

const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
type Status = (typeof STATUSES)[number];

export function StatusControls({ handbookId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSet(status: Status) {
    setError(null);
    startTransition(async () => {
      const result = await setHandbookStatusAction(handbookId, status);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded border border-border p-3">
      <p className="mb-2 text-xs text-text-muted uppercase tracking-wide">Status</p>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleSet(s)}
            disabled={isPending || s === currentStatus}
            className={
              s === currentStatus
                ? "rounded border border-border-light px-3 py-1.5 text-sm font-semibold text-text-primary cursor-default"
                : "rounded border border-border-light px-3 py-1.5 text-sm text-text-secondary hover:border-primary hover:text-text-primary disabled:opacity-50"
            }
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-fg-red-light">{error}</p>}
    </div>
  );
}
