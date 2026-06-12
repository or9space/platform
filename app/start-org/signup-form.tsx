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
      {error && <p className="rounded border border-red-800 bg-red-950 p-2 text-sm text-red-300">{error}</p>}
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Org name</label>
        <input name="name" required maxLength={120} className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Subdomain</label>
        <div className="flex items-center gap-2">
          <input name="slug" required pattern="[a-z][a-z0-9-]{2,40}" className="w-48 rounded border border-neutral-700 bg-neutral-900 p-2" />
          <span className="text-neutral-500">.or9.space</span>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Your email</label>
        <input name="email" type="email" required className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Tell us about your org (250 chars)</label>
        <textarea name="description" required maxLength={500} rows={3} className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      </div>
      <button type="submit" disabled={pending} aria-busy={pending}
        className="rounded bg-neutral-100 px-4 py-2 font-semibold text-neutral-900 disabled:opacity-50">
        {pending ? "Submitting…" : "Request your org"}
      </button>
    </form>
  );
}
