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
      <main className="mx-auto mt-16 w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Password set</h1>
        <p className="rounded border border-green-800 bg-green-950 p-3 text-sm text-green-300">
          You can now sign in. Redirecting…
        </p>
        <p className="text-sm text-neutral-400">
          <a href="/login" className="underline">Go to sign in</a>
        </p>
      </main>
    );
  }

  return (
    <form action={handleSubmit} className="mx-auto mt-16 w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Set your password</h1>
      <p className="text-sm text-neutral-400">
        For <strong className="text-neutral-200">{email}</strong> on {tenantName}.
      </p>
      {error && <p className="rounded border border-red-800 bg-red-950 p-2 text-sm text-red-300">{error}</p>}
      <input
        name="password"
        type="password"
        required
        placeholder="New password (10+ chars)"
        autoComplete="new-password"
        className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
      />
      <input
        name="confirm"
        type="password"
        required
        placeholder="Confirm password"
        autoComplete="new-password"
        className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
      />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="w-full rounded bg-neutral-100 p-2 font-semibold text-neutral-900 disabled:opacity-50"
      >
        {pending ? "Working…" : "Set password"}
      </button>
    </form>
  );
}
