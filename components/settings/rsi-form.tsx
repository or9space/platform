"use client";

import { useState, useTransition } from "react";
import { updateExtendedProfileAction } from "@/lib/actions/profile";

export function RsiForm({ initial }: { initial: { rsiHandle: string } }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    if (pending) return;
    setMsg(null);
    setError(null);
    const rsiHandle = String(fd.get("rsiHandle") ?? "") || null;
    start(async () => {
      const r = await updateExtendedProfileAction({ rsiHandle });
      if (!r.ok) { setError(r.error); return; }
      setMsg("Saved.");
    });
  }

  const field =
    "mt-1 w-full border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none";

  return (
    <form action={submit} className="max-w-lg space-y-4">
      {msg && (
        <div className="border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
          <span className="mfd-label">{msg}</span>
        </div>
      )}
      {error && (
        <div className="border border-danger bg-surface px-3 py-2 text-sm text-fg-red-light">
          <span className="mfd-label">{error}</span>
        </div>
      )}
      <label className="block text-sm">
        <span className="mfd-label">RSI HANDLE</span>
        <input
          name="rsiHandle"
          defaultValue={initial.rsiHandle}
          maxLength={60}
          placeholder="YourRSIHandle"
          className={field}
        />
      </label>
      <p className="text-xs text-text-muted">
        Your Roberts Space Industries citizen handle, used for fleet sync and member lookup.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50 hover:bg-primary/20 transition-colors"
      >
        {pending ? "SAVING…" : "SAVE RSI HANDLE"}
      </button>
    </form>
  );
}
