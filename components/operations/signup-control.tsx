"use client";

import { useState, useTransition } from "react";
import { signupOperationAction, withdrawOperationAction } from "@/lib/actions/operations";

export function SignupControl({
  operationId,
  joined,
  currentRole,
}: {
  operationId: string;
  joined: boolean;
  currentRole: string | null;
}) {
  const [isJoined, setJoined] = useState(joined);
  const [role, setRole] = useState(currentRole ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function join() {
    setError(null);
    start(async () => {
      const r = await signupOperationAction(operationId, role.trim() || null);
      if (!r.ok) { setError(r.error); return; }
      setJoined(true);
    });
  }
  function withdraw() {
    setError(null);
    start(async () => {
      const r = await withdrawOperationAction(operationId);
      if (!r.ok) { setError(r.error); return; }
      setJoined(false);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role (optional, e.g. Pilot)"
          maxLength={80}
          className="w-48 rounded border border-border-light bg-surface px-2 py-1.5 text-sm"
        />
        <button onClick={join} disabled={pending}
          className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream disabled:opacity-50">
          {isJoined ? "Update role" : "Sign up"}
        </button>
        {isJoined && (
          <button onClick={withdraw} disabled={pending}
            className="rounded border border-border-light px-3 py-1.5 text-sm hover:border-primary disabled:opacity-50">
            Withdraw
          </button>
        )}
      </div>
      {isJoined && <p className="text-xs text-green-400">You're signed up{role.trim() ? ` as ${role.trim()}` : ""}.</p>}
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
    </div>
  );
}
