"use client";

import { useState, useTransition } from "react";
import { createPendingTenant } from "@/lib/actions/signup";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createPendingTenant({
        slug: String(formData.get("slug") ?? "").toLowerCase(),
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        description: String(formData.get("description") ?? ""),
        turnstileToken: String(formData.get("cf-turnstile-response") ?? "") || null,
      });
      if (!result.ok) { setError(result.error); return; }
      setDone(true);
    });
  }

  if (done) {
    return (
      <p className="rounded border border-green-800 bg-green-950 p-4 text-green-300">
        Request received. We review every org by hand — you will hear from us by email within 24 hours.
      </p>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <p className="rounded border border-danger bg-surface p-2 text-sm text-fg-red-light">{error}</p>}
      <div>
        <label className="mb-1 block text-sm text-text-secondary">Org name</label>
        <input name="name" required maxLength={120} className="w-full rounded border border-border-light bg-surface p-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-secondary">Subdomain</label>
        <div className="flex items-center gap-2">
          <input name="slug" required pattern="[a-z][a-z0-9-]{2,40}" className="w-48 rounded border border-border-light bg-surface p-2" />
          <span className="text-text-muted">.or9.space</span>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-secondary">Your email</label>
        <input name="email" type="email" required className="w-full rounded border border-border-light bg-surface p-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-secondary">Tell us about your org (250 chars)</label>
        <textarea name="description" required maxLength={500} rows={3} className="w-full rounded border border-border-light bg-surface p-2" />
      </div>
      <button type="submit" disabled={pending} aria-busy={pending}
        className="rounded bg-primary px-4 py-2 font-semibold text-fg-cream disabled:opacity-50">
        {pending ? "Submitting…" : "Request your org"}
      </button>
    </form>
  );
}
