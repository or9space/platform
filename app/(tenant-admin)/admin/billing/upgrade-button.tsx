"use client";

import { useTransition, useState } from "react";
import { startUpgradeAction } from "@/lib/actions/billing";

interface UpgradeButtonProps {
  tenantId: string;
  priceId: string;
}

export function UpgradeButton({ tenantId, priceId }: UpgradeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startUpgradeAction(tenantId, priceId);
      if (result.ok) {
        window.location.href = result.url;
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {isPending ? "Redirecting…" : "Upgrade to Paid"}
      </button>
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
    </div>
  );
}
