"use client";

import { useState, useTransition } from "react";
import { adminReplyTicketAction, adminCloseTicketAction } from "@/lib/actions/support";

export function AdminReplyForm({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (closed) return <p className="text-sm text-text-muted">Closed.</p>;

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await adminReplyTicketAction(ticketId, String(formData.get("body") ?? ""));
      if (!r.ok) { setError(r.error); return; }
      window.location.reload();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-2">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <textarea name="body" required maxLength={5000} rows={3}
        className="w-full rounded border border-border-light bg-surface p-2" />
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="rounded bg-blue-700 px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
          Reply as or9 support
        </button>
        <button type="button" disabled={pending}
          onClick={() => startTransition(async () => { await adminCloseTicketAction(ticketId); window.location.href = "/support"; })}
          className="rounded border border-border-light px-3 py-1.5 text-sm disabled:opacity-50">
          Close
        </button>
      </div>
    </form>
  );
}
