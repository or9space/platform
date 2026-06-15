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

  const field = "mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-sm";

  return (
    <form action={submit} className="max-w-lg space-y-4">
      {msg && <p className="rounded border border-green-800 bg-green-950 p-2 text-sm text-green-300">{msg}</p>}
      {error && <p className="rounded border border-red-800 bg-red-950 p-2 text-sm text-red-300">{error}</p>}
      <label className="block text-sm">
        Display name
        <input name="displayName" defaultValue={initial.displayName} maxLength={120} className={field} />
      </label>
      <label className="block text-sm">
        Avatar URL
        <input name="avatarUrl" defaultValue={initial.avatarUrl} maxLength={500} placeholder="https://…" className={field} />
      </label>
      <label className="block text-sm">
        Bio
        <textarea name="bio" rows={4} defaultValue={initial.bio} maxLength={500} className={field} />
      </label>
      <button type="submit" disabled={pending}
        className="rounded bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
