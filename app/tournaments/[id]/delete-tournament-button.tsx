"use client";

import { useState, useTransition } from "react";
import { deleteTournamentAction } from "@/lib/actions/tournaments";

export function DeleteTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (pending) return;
    if (!confirm("Delete this tournament? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteTournamentAction(tournamentId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      window.location.href = "/tournaments";
    });
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-fg-red-light">{error}</p>}
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded border border-danger px-3 py-1.5 text-sm text-fg-red-light hover:bg-red-900/30 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete tournament"}
      </button>
    </div>
  );
}
