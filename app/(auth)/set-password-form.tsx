"use client";

import { useState, useTransition } from "react";
import { setPasswordWithToken } from "@/lib/actions/account-setup";

export function SetPasswordForm({
  token,
  email,
  tenantName,
}: {
  token: string;
  email: string;
  tenantName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    startTransition(async () => {
      const res = await setPasswordWithToken({ token, password });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    });
  }

  if (done) {
    return (
      <main className="tenant-root bg-tactical-grid flex items-center justify-center p-6">
        <div className="w-full max-w-sm border border-border bg-surface p-6 mfd-cut-tl-br space-y-4">
          <h1 className="text-stencil text-2xl text-text-primary">Password set</h1>
          <p className="text-sm text-text-secondary">You can now sign in. Redirecting…</p>
          <p className="text-sm">
            <a href="/login" className="text-text-secondary hover:text-text-primary underline text-sm">Go to sign in</a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="tenant-root bg-tactical-grid flex items-center justify-center p-6">
      <form action={handleSubmit} className="w-full max-w-sm border border-border bg-surface p-6 mfd-cut-tl-br space-y-4">
        <h1 className="text-stencil text-2xl text-text-primary">Set your password</h1>
        <p className="text-sm text-text-secondary">
          For <strong className="text-text-primary">{email}</strong> on {tenantName}.
        </p>
        {error && <p className="text-fg-red-light text-sm">{error}</p>}
        <div className="space-y-1">
          <span className="mfd-label">New password</span>
          <input
            name="password"
            type="password"
            required
            placeholder="New password (10+ chars)"
            autoComplete="new-password"
            className="w-full rounded border border-border-light bg-surface-elevated p-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <span className="mfd-label">Confirm password</span>
          <input
            name="confirm"
            type="password"
            required
            placeholder="Confirm password"
            autoComplete="new-password"
            className="w-full rounded border border-border-light bg-surface-elevated p-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Working…" : "Set password"}
        </button>
      </form>
    </main>
  );
}
