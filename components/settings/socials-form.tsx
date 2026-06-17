"use client";

import { useState, useTransition } from "react";
import { updateExtendedProfileAction } from "@/lib/actions/profile";

interface SocialsInitial {
  discord: string;
  twitch: string;
  youtube: string;
  website: string;
}

const FIELDS: { name: keyof SocialsInitial; label: string; placeholder: string }[] = [
  { name: "discord", label: "DISCORD USERNAME", placeholder: "YourName#1234" },
  { name: "twitch", label: "TWITCH HANDLE", placeholder: "yourhandle" },
  { name: "youtube", label: "YOUTUBE CHANNEL URL", placeholder: "https://youtube.com/@yourchannel" },
  { name: "website", label: "WEBSITE URL", placeholder: "https://yoursite.com" },
];

export function SocialsForm({ initial }: { initial: SocialsInitial }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    if (pending) return;
    setMsg(null);
    setError(null);
    const socials = {
      discord: String(fd.get("discord") ?? "") || null,
      twitch: String(fd.get("twitch") ?? "") || null,
      youtube: String(fd.get("youtube") ?? "") || null,
      website: String(fd.get("website") ?? "") || null,
    };
    start(async () => {
      const r = await updateExtendedProfileAction({ socials });
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
      {FIELDS.map(({ name, label, placeholder }) => (
        <label key={name} className="block text-sm">
          <span className="mfd-label">{label}</span>
          <input
            name={name}
            defaultValue={initial[name]}
            maxLength={name === "website" || name === "youtube" ? 500 : 100}
            placeholder={placeholder}
            className={field}
          />
        </label>
      ))}
      <button
        type="submit"
        disabled={pending}
        className="border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50 hover:bg-primary/20 transition-colors"
      >
        {pending ? "SAVING…" : "SAVE SOCIAL LINKS"}
      </button>
    </form>
  );
}
