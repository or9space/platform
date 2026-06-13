"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerSelfAction } from "@/lib/actions/tournaments";

export function RegisterButton({ tournamentId }: { tournamentId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await registerSelfAction(tournamentId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50"
      >
        {pending ? "Registering…" : "Register"}
      </button>
    </div>
  );
}
