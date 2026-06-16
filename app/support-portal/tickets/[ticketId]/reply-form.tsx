"use client";

import { useState, useTransition } from "react";
import { replyTicketAction, closeTicketAction } from "@/lib/actions/support";

export function ReplyForm({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (closed) return <p className="text-sm text-text-muted">This ticket is closed.</p>;

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await replyTicketAction(ticketId, String(formData.get("body") ?? ""));
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
          className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream disabled:opacity-50">
          Reply
        </button>
        <button type="button" disabled={pending}
          onClick={() => startTransition(async () => { await closeTicketAction(ticketId); window.location.reload(); })}
          className="rounded border border-border-light px-3 py-1.5 text-sm disabled:opacity-50">
          Close ticket
        </button>
      </div>
    </form>
  );
}
