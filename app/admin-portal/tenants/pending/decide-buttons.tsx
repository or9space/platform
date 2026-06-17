"use client";

import { useState, useTransition } from "react";
import { approveTenantAction, rejectTenantAction } from "@/lib/actions/admin-tenants";

export function DecideButtons({ pendingId }: { pendingId: string }) {
  const [pending, startTransition] = useTransition();
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (claimUrl) {
    return (
      <div className="text-xs">
        <p className="text-green-400">Approved. Claim URL (also emailed):</p>
        <code className="block break-all rounded bg-surface p-1">{claimUrl}</code>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-fg-red-light">{error}</span>}
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await approveTenantAction(pendingId);
            if (r.ok) setClaimUrl(r.claimUrl);
            else setError(r.error);
          })
        }
        className="rounded bg-green-700 px-3 py-1 text-sm disabled:opacity-50">
        Approve
      </button>
      <button
        disabled={pending}
        onClick={() => {
          const reason = window.prompt("Rejection reason (sent to requester):") ?? "";
          if (!reason) return;
          startTransition(async () => {
            await rejectTenantAction(pendingId, reason);
            window.location.reload();
          });
        }}
        className="rounded bg-danger px-3 py-1 text-sm disabled:opacity-50">
        Reject
      </button>
    </div>
  );
}
