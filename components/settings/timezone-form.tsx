"use client";

import { useState, useTransition } from "react";
import { updateExtendedProfileAction } from "@/lib/actions/profile";

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

export function TimezoneForm({ initial }: { initial: { timezone: string } }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    if (pending) return;
    setMsg(null);
    setError(null);
    const timezone = String(fd.get("timezone") ?? "") || null;
    start(async () => {
      const r = await updateExtendedProfileAction({ timezone });
      if (!r.ok) { setError(r.error); return; }
      setMsg("Saved.");
    });
  }

  const select =
    "mt-1 w-full border border-border-light bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none";

  return (
    <form action={submit} className="max-w-lg space-y-4">
      {msg && (
        <div className="border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
          <span className="mfd-label">{msg}</span>
        </div>
      )}
      {error && (
        <div className="border border-danger bg-surface px-3 py-2 text-sm text-fg-red-light">
          <span className="mfd-label">{error}</span>
        </div>
      )}
      <label className="block text-sm">
        <span className="mfd-label">TIMEZONE</span>
        <select name="timezone" defaultValue={initial.timezone} className={select}>
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-text-muted">
        Used to display dates and times in your local timezone across the platform.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50 hover:bg-primary/20 transition-colors"
      >
        {pending ? "SAVING…" : "SAVE TIMEZONE"}
      </button>
    </form>
  );
}
