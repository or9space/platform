"use client";

import { useState, useTransition } from "react";
import { rsvpEventAction } from "@/lib/actions/events";

const OPTIONS: { status: "GOING" | "MAYBE" | "NOT_GOING"; label: string }[] = [
  { status: "GOING", label: "Going" },
  { status: "MAYBE", label: "Maybe" },
  { status: "NOT_GOING", label: "Can't make it" },
];

export function RsvpButtons({ eventId, current }: { eventId: string; current: string | null }) {
  const [selected, setSelected] = useState<string | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function choose(status: "GOING" | "MAYBE" | "NOT_GOING") {
    if (pending || status === selected) return;
    setError(null);
    const prev = selected;
    setSelected(status);
    start(async () => {
      const r = await rsvpEventAction(eventId, status);
      if (!r.ok) {
        setSelected(prev);
        setError(r.error);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.status}
            onClick={() => choose(o.status)}
            disabled={pending}
            aria-pressed={selected === o.status}
            className={
              "rounded border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 " +
              (selected === o.status
                ? "border-neutral-300 bg-neutral-100 font-semibold text-neutral-900"
                : "border-neutral-700 text-neutral-300 hover:border-neutral-500")
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
