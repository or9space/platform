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
    <div className="rounded border border-neutral-800 p-3">
      <p className="mb-2 text-xs text-neutral-500 uppercase tracking-wide">Status</p>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleSet(s)}
            disabled={isPending || s === currentStatus}
            className={
              s === currentStatus
                ? "rounded border border-neutral-600 px-3 py-1.5 text-sm font-semibold text-neutral-100 cursor-default"
                : "rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 disabled:opacity-50"
            }
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
