"use client";

import { useState, useTransition } from "react";
import { createTicketAction } from "@/lib/actions/support";

export function TicketForm({ tenantContextId }: { tenantContextId: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await createTicketAction({
        subject: String(formData.get("subject") ?? ""),
        body: String(formData.get("body") ?? ""),
        tenantContextId,
      });
      if (!r.ok) { setError(r.error); return; }
      window.location.href = `/tickets/${(r as { ok: true; ticketId: string }).ticketId}`;
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      {error && <p className="rounded border border-red-800 bg-red-950 p-2 text-sm text-red-300">{error}</p>}
      <input name="subject" required maxLength={200} placeholder="Subject"
        className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <textarea name="body" required maxLength={5000} rows={5} placeholder="Describe the problem…"
        className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <button type="submit" disabled={pending} aria-busy={pending}
        className="rounded bg-neutral-100 px-4 py-2 font-semibold text-neutral-900 disabled:opacity-50">
        {pending ? "Submitting…" : "Open ticket"}
      </button>
    </form>
  );
}
