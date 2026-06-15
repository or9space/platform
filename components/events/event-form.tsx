"use client";

import { useState, useTransition } from "react";
import { createEventAction, updateEventAction } from "@/lib/actions/events";

const TYPES = ["OP", "MEETING", "TRAINING", "SOCIAL", "TOURNAMENT", "OTHER"] as const;

export interface EventFormInitial {
  title: string;
  type: string;
  startsAt: string; // datetime-local value
  endsAt: string;
  location: string;
  description: string;
}

export function EventForm({ eventId, initial }: { eventId?: string; initial?: EventFormInitial }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = {
      title: String(fd.get("title") ?? ""),
      type: String(fd.get("type") ?? "OP") as (typeof TYPES)[number],
      startsAt: String(fd.get("startsAt") ?? ""),
      endsAt: String(fd.get("endsAt") ?? "") || null,
      location: String(fd.get("location") ?? "") || null,
      description: String(fd.get("description") ?? "") || null,
    };
    if (!input.startsAt) {
      setError("Start time is required");
      return;
    }
    start(async () => {
      const r = eventId ? await updateEventAction(eventId, input) : await createEventAction(input);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      window.location.href = eventId ? `/events/${eventId}` : "/events";
    });
  }

  const i = initial;
  const field = "mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-sm";

  return (
    <form action={submit} className="max-w-lg space-y-4">
      {error && <p className="rounded border border-red-800 bg-red-950 p-2 text-sm text-red-300">{error}</p>}
      <label className="block text-sm">
        Title
        <input name="title" required defaultValue={i?.title ?? ""} maxLength={160} className={field} />
      </label>
      <label className="block text-sm">
        Type
        <select name="type" defaultValue={i?.type ?? "OP"} className={field}>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Starts
          <input name="startsAt" type="datetime-local" required defaultValue={i?.startsAt ?? ""} className={field} />
        </label>
        <label className="block text-sm">
          Ends (optional)
          <input name="endsAt" type="datetime-local" defaultValue={i?.endsAt ?? ""} className={field} />
        </label>
      </div>
      <label className="block text-sm">
        Location (optional)
        <input name="location" defaultValue={i?.location ?? ""} maxLength={200} className={field} />
      </label>
      <label className="block text-sm">
        Details (optional)
        <textarea name="description" rows={4} defaultValue={i?.description ?? ""} maxLength={5000} className={field} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50"
      >
        {pending ? "Saving…" : eventId ? "Save changes" : "Create event"}
      </button>
    </form>
  );
}
