"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { setDirectoryListingAction } from "@/lib/actions/directory";

interface Props {
  tenantId: string;
  initial: { isListed: boolean; tagline: string };
}

export function DirectoryForm({ tenantId, initial }: Props) {
  const [isListed, setIsListed] = useState(initial.isListed);
  const [tagline, setTagline] = useState(initial.tagline);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setDirectoryListingAction(tenantId, {
        isListed,
        tagline: tagline.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isListed}
          onChange={(e) => setIsListed(e.target.checked)}
          className="h-4 w-4 rounded border-border-light bg-surface-elevated accent-red-500"
        />
        <span className="text-sm font-medium text-text-primary">
          List this org publicly
        </span>
      </label>

      <div>
        <label className="block text-sm font-medium text-text-secondary" htmlFor="tagline">
          Tagline
        </label>
        <p className="mb-1 text-xs text-text-muted">
          A short description shown on the directory (max 200 characters).
        </p>
        <input
          id="tagline"
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={200}
          placeholder="We are a competitive esports org..."
          className="mt-1 w-full rounded border border-border-light bg-surface px-3 py-2 text-sm text-white placeholder-text-muted focus:border-border-light focus:outline-none"
        />
      </div>

      <p className="text-xs text-text-muted">
        When listed, your org appears on the public or9.space/orgs directory.
      </p>

      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      {saved && <p className="text-sm text-green-400">Saved.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
