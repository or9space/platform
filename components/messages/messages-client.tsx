"use client";

import { useState, useTransition } from "react";
import { startConversationAction, sendMessageAction } from "@/lib/actions/messages";

const field = "w-full rounded border border-border-light bg-surface p-2 text-sm";

export function NewConversationForm() {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const username = String(fd.get("username") ?? "").trim();
    start(async () => {
      const r = await startConversationAction(username);
      if (!r.ok) { setError(r.error); return; }
      window.location.href = `/messages/${r.id}`;
    });
  }
  if (!open) return <button onClick={() => setOpen(true)} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream">New message</button>;
  return (
    <form action={submit} className="flex items-center gap-2 rounded border border-border p-3">
      {error && <p className="text-xs text-fg-red-light">{error}</p>}
      <input name="username" required placeholder="Member username" maxLength={60} className={field} />
      <button type="submit" disabled={pending} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream disabled:opacity-50">{pending ? "…" : "Start"}</button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-text-secondary">Cancel</button>
    </form>
  );
}

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const body = String(fd.get("body") ?? "");
    start(async () => {
      const r = await sendMessageAction(conversationId, body);
      if (!r.ok) { setError(r.error); return; }
      window.location.reload();
    });
  }
  return (
    <form action={submit} className="space-y-2 border-t border-border pt-3">
      {error && <p className="text-xs text-fg-red-light">{error}</p>}
      <textarea name="body" required rows={3} placeholder="Write a message…" maxLength={5000} className={field} />
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream disabled:opacity-50">{pending ? "Sending…" : "Send"}</button>
    </form>
  );
}
