"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";

export function AuthForm({
  mode,
  tenantName,
  registerAction,
}: {
  mode: "login" | "register";
  tenantName: string;
  registerAction?: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      if (mode === "register" && registerAction) {
        const result = await registerAction(formData);
        if (!result.ok) {
          setError(result.error ?? "Registration failed");
          return;
        }
      }
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError(mode === "login" ? "Invalid email or password" : "Registered — but sign-in failed; try logging in");
        return;
      }
      window.location.href = "/";
    });
  }

  return (
    <form action={handleSubmit} className="mx-auto mt-16 w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">
        {mode === "login" ? `Sign in to ${tenantName}` : `Join ${tenantName}`}
      </h1>
      {error && <p className="rounded border border-danger bg-surface p-2 text-sm text-fg-red-light">{error}</p>}
      {mode === "register" && (
        <input name="username" required placeholder="Username" autoComplete="username"
          className="w-full rounded border border-border-light bg-surface p-2" />
      )}
      <input name="email" type="email" required placeholder="Email" autoComplete="email"
        className="w-full rounded border border-border-light bg-surface p-2" />
      <input name="password" type="password" required placeholder="Password (10+ chars)"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        className="w-full rounded border border-border-light bg-surface p-2" />
      <button type="submit" disabled={pending} aria-busy={pending}
        className="w-full rounded bg-primary p-2 font-semibold text-fg-cream disabled:opacity-50">
        {pending ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-sm text-text-secondary">
        {mode === "login" ? <a href="/register" className="underline">Need an account?</a>
                          : <a href="/login" className="underline">Already a member?</a>}
      </p>
    </form>
  );
}
