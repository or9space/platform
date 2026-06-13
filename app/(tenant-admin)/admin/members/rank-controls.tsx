"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMemberTierAction } from "@/lib/actions/members";
import type { RankTier } from "@/lib/permissions";

const TIERS: RankTier[] = ["ENLISTED", "NCO", "OFFICER", "COMMAND"];

interface RankControlsProps {
  membershipId: string;
  currentTier: RankTier;
  username: string;
}

export function RankControls({ membershipId, currentTier, username }: RankControlsProps) {
  const [selected, setSelected] = useState<RankTier>(currentTier);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const unchanged = selected === currentTier;

  function handleApply() {
    setError(null);
    startTransition(async () => {
      const result = await setMemberTierAction(membershipId, selected);
      if (!result.ok) {
        setError(result.error ?? "Unknown error");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <select
          aria-label={`Change rank for @${username}`}
          value={selected}
          onChange={(e) => {
            setError(null);
            setSelected(e.target.value as RankTier);
          }}
          disabled={isPending}
          className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 disabled:opacity-50"
        >
          {TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleApply}
          disabled={isPending || unchanged}
          className="rounded bg-neutral-700 px-3 py-1 text-sm font-medium text-neutral-100 hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Applying…" : "Apply"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
