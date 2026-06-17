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
    <main className="tenant-root bg-tactical-grid flex items-center justify-center p-6">
      <form action={handleSubmit} className="w-full max-w-sm border border-border bg-surface p-6 mfd-cut-tl-br space-y-4">
        <h1 className="text-stencil text-2xl text-text-primary">
          {mode === "login" ? `Sign in to ${tenantName}` : `Join ${tenantName}`}
        </h1>
        {error && <p className="text-fg-red-light text-sm">{error}</p>}
        {mode === "register" && (
          <div className="space-y-1">
            <span className="mfd-label">Username</span>
            <input name="username" required placeholder="Username" autoComplete="username"
              className="w-full rounded border border-border-light bg-surface-elevated p-2 text-sm" />
          </div>
        )}
        <div className="space-y-1">
          <span className="mfd-label">Email</span>
          <input name="email" type="email" required placeholder="Email" autoComplete="email"
            className="w-full rounded border border-border-light bg-surface-elevated p-2 text-sm" />
        </div>
        <div className="space-y-1">
          <span className="mfd-label">Password</span>
          <input name="password" type="password" required placeholder="Password (10+ chars)"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded border border-border-light bg-surface-elevated p-2 text-sm" />
        </div>
        <button type="submit" disabled={pending} aria-busy={pending}
          className="w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream hover:bg-primary-hover disabled:opacity-50">
          {pending ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <p className="text-sm">
          {mode === "login"
            ? <a href="/register" className="text-text-secondary hover:text-text-primary underline text-sm">Need an account?</a>
            : <a href="/login" className="text-text-secondary hover:text-text-primary underline text-sm">Already a member?</a>}
        </p>
      </form>
    </main>
  );
}
