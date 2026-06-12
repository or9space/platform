"use client";

import { useState, useTransition } from "react";
import { claimFounderSeat } from "@/lib/actions/claim";

export function ClaimForm({ tenantSlug, token }: { tenantSlug: string; token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await claimFounderSeat({
        tenantSlug, token,
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        username: String(formData.get("username") ?? ""),
      });
      if (!r.ok) { setError(r.error); return; }
      window.location.href = "/login?claimed=1";
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <p className="rounded border border-red-800 bg-red-950 p-2 text-sm text-red-300">{error}</p>}
      <input name="username" required placeholder="Your username" className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <input name="email" type="email" required placeholder="Email" className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <input name="password" type="password" required placeholder="Password (10+ chars)" className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <button type="submit" disabled={pending} aria-busy={pending}
        className="w-full rounded bg-neutral-100 p-2 font-semibold text-neutral-900 disabled:opacity-50">
        {pending ? "Claiming…" : "Claim founder seat"}
      </button>
    </form>
  );
}
