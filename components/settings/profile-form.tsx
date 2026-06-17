"use client";

import { useState, useTransition } from "react";
import { updateProfileAction } from "@/lib/actions/profile";

export interface ProfileInitial {
  displayName: string;
  bio: string;
  avatarUrl: string;
}

export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    if (pending) return;
    setMsg(null);
    setError(null);
    const input = {
      displayName: String(fd.get("displayName") ?? "") || null,
      bio: String(fd.get("bio") ?? "") || null,
      avatarUrl: String(fd.get("avatarUrl") ?? "") || null,
    };
    start(async () => {
      const r = await updateProfileAction(input);
      if (!r.ok) { setError(r.error); return; }
      setMsg("Saved.");
    });
  }

  const field = "mt-1 w-full border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none";

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
        <span className="mfd-label">DISPLAY NAME</span>
        <input name="displayName" defaultValue={initial.displayName} maxLength={120} className={field} />
      </label>
      <label className="block text-sm">
        <span className="mfd-label">AVATAR URL</span>
        <input name="avatarUrl" defaultValue={initial.avatarUrl} maxLength={500} placeholder="https://…" className={field} />
      </label>
      <label className="block text-sm">
        <span className="mfd-label">BIO</span>
        <textarea name="bio" rows={4} defaultValue={initial.bio} maxLength={500} className={field} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50 hover:bg-primary/20 transition-colors"
      >
        {pending ? "SAVING…" : "SAVE PROFILE"}
      </button>
    </form>
  );
}
