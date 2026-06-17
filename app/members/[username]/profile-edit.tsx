"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOwnProfileAction } from "@/lib/actions/members";

interface ProfileEditProps {
  initial: {
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
  };
}

export function ProfileEdit({ initial }: ProfileEditProps) {
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    setSaved(false);

    const dn = String(formData.get("displayName") ?? "").trim();
    const b = String(formData.get("bio") ?? "").trim();
    const av = String(formData.get("avatarUrl") ?? "").trim();

    const input: { displayName?: string; bio?: string; avatarUrl?: string } = {};
    if (dn) input.displayName = dn;
    if (b) input.bio = b;
    if (av) input.avatarUrl = av;

    startTransition(async () => {
      const r = await updateOwnProfileAction(input);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      {saved && <p className="mfd-label text-primary">PROFILE UPDATED</p>}
      <label className="block">
        <span className="mfd-label block mb-1">DISPLAY NAME</span>
        <input
          name="displayName"
          maxLength={80}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full border border-border-light bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mfd-label block mb-1">BIO</span>
        <textarea
          name="bio"
          maxLength={500}
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full border border-border-light bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mfd-label block mb-1">AVATAR URL</span>
        <input
          name="avatarUrl"
          type="url"
          maxLength={500}
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…"
          className="w-full border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="border border-primary bg-primary/10 px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
      >
        {pending ? "SAVING…" : "[ SAVE ]"}
      </button>
    </form>
  );
}
