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
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleSet(s)}
            disabled={isPending || s === currentStatus}
            className={
              s === currentStatus
                ? "mfd-label rounded border border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary cursor-default"
                : "mfd-label rounded border border-border-light px-3 py-1.5 text-sm text-text-secondary hover:border-primary hover:text-text-primary disabled:opacity-50 transition-colors"
            }
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-fg-red-light">{error}</p>}
    </div>
  );
}
