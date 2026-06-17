"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeHandbookAction } from "@/lib/actions/handbook";
import type { ViewerAck } from "@/lib/queries/handbook";
import { CheckCircle } from "lucide-react";

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
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <CheckCircle className="h-4 w-4 text-primary" />
        <span className="mfd-label">ACKNOWLEDGED</span>
        <span className="text-text-muted">(v{ack.versionRead})</span>
      </div>
    );
  }

  const label = !ack
    ? "ACKNOWLEDGE"
    : `RE-ACKNOWLEDGE (UPDATED TO v${version})`;

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
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text-secondary">
        Confirm you have read v{version}. Re-acknowledge after any update.
      </p>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="mfd-label self-start rounded border border-primary bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
      >
        {isPending ? "SAVING…" : label}
      </button>
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
    </div>
  );
}
