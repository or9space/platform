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
    <div className="mt-6 rounded border border-border p-4">
      <h2 className="mb-4 font-semibold">Edit profile</h2>
      <form action={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-fg-red-light">{error}</p>}
        {saved && <p className="text-sm text-green-400">Profile updated.</p>}
        <label className="block text-sm">
          Display name
          <input
            name="displayName"
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded border border-border-light bg-surface p-2"
          />
        </label>
        <label className="block text-sm">
          Bio
          <textarea
            name="bio"
            maxLength={500}
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 w-full rounded border border-border-light bg-surface p-2"
          />
        </label>
        <label className="block text-sm">
          Avatar URL
          <input
            name="avatarUrl"
            type="url"
            maxLength={500}
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded border border-border-light bg-surface p-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
