"use client";

import { useState, useTransition } from "react";
import { createLoginLink } from "@/lib/actions/account-setup";

/** Generates a one-time set-password link for a member and shows it to copy. */
export function LoginLinkButton({ tenantId, membershipId }: { tenantId: string; membershipId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function generate() {
    if (pending) return;
    setError(null);
    start(async () => {
      const r = await createLoginLink(tenantId, membershipId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setUrl(window.location.origin + r.path);
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy failed — select the text manually");
    }
  }

  if (url) {
    return (
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-56 rounded border border-border-light bg-surface px-2 py-1 text-xs text-text-secondary"
        />
        <button onClick={copy} className="rounded border border-border-light px-2 py-1 text-xs hover:border-primary">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={generate}
        disabled={pending}
        className="rounded border border-border-light px-3 py-1 text-xs hover:border-primary disabled:opacity-50"
      >
        {pending ? "…" : "Login link"}
      </button>
      {error && <p className="mt-1 text-xs text-fg-red-light">{error}</p>}
    </div>
  );
}
