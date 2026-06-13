"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeHandbookAction } from "@/lib/actions/handbook";
import type { ViewerAck } from "@/lib/queries/handbook";

interface Props {
  handbookId: string;
  version: number;
  ack: ViewerAck | null;
}

export function AcknowledgeButton({ handbookId, version, ack }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (ack && !ack.isStale) {
    return (
      <span className="text-sm text-neutral-400">
        Acknowledged ✓ (v{ack.versionRead})
      </span>
    );
  }

  const label = !ack
    ? "Acknowledge"
    : `Re-acknowledge (updated to v${version})`;

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await acknowledgeHandbookAction(handbookId);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-500 disabled:opacity-50"
      >
        {isPending ? "Saving…" : label}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
