"use client";

import { useState, useTransition } from "react";
import { createOperationAction, updateOperationAction } from "@/lib/actions/operations";

const STATUSES = ["PLANNING", "BRIEFING", "ACTIVE", "DEBRIEFING", "COMPLETED", "ARCHIVED"] as const;

export interface OperationFormInitial {
  title: string;
  description: string;
  status: string;
  scheduledAt: string;
  location: string;
  objectives: string[];
  aar: string;
}

export function OperationForm({ operationId, initial }: { operationId?: string; initial?: OperationFormInitial }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Objectives: one line per objective in the textarea
  const [objectivesText, setObjectivesText] = useState(
    initial?.objectives?.join("\n") ?? ""
  );

  function submit(fd: FormData) {
    if (pending) return;
    setError(null);

    // Split non-empty lines into objectives array
    const objectives = objectivesText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const input = {
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? "") || null,
      status: String(fd.get("status") ?? "PLANNING"),
      scheduledAt: String(fd.get("scheduledAt") ?? "") || null,
      location: String(fd.get("location") ?? "") || null,
      objectives,
      aar: operationId ? (String(fd.get("aar") ?? "") || null) : undefined,
    };
    start(async () => {
      const r = operationId ? await updateOperationAction(operationId, input) : await createOperationAction(input);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      window.location.href = operationId ? `/operations/${operationId}` : "/operations";
    });
  }

  const i = initial;
  const field = "mt-1 w-full rounded border border-border-light bg-surface p-2 text-sm";

  return (
    <form action={submit} className="max-w-lg space-y-4">
      {error && <p className="rounded border border-danger bg-surface p-2 text-sm text-fg-red-light">{error}</p>}
      <label className="block text-sm">
        Title
        <input name="title" required defaultValue={i?.title ?? ""} maxLength={160} className={field} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Status
          <select name="status" defaultValue={i?.status ?? "PLANNING"} className={field}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          Scheduled (optional)
          <input name="scheduledAt" type="datetime-local" defaultValue={i?.scheduledAt ?? ""} className={field} />
        </label>
      </div>
      <label className="block text-sm">
        Location (optional)
        <input name="location" defaultValue={i?.location ?? ""} maxLength={200} className={field} />
      </label>
      <label className="block text-sm">
        Briefing (optional)
        <textarea name="description" rows={5} defaultValue={i?.description ?? ""} maxLength={10000} className={field} />
      </label>
      <label className="block text-sm">
        Objectives (optional — one per line)
        <textarea
          rows={4}
          value={objectivesText}
          onChange={(e) => setObjectivesText(e.target.value)}
          placeholder={"Neutralize primary target\nSecure extraction point"}
          className={field}
        />
      </label>
      {operationId && (
        <label className="block text-sm">
          After-Action Report (optional)
          <textarea
            name="aar"
            rows={6}
            defaultValue={i?.aar ?? ""}
            maxLength={20000}
            placeholder="Outcomes, lessons learned, recommendations…"
            className={field}
          />
        </label>
      )}
      <button type="submit" disabled={pending}
        className="rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream disabled:opacity-50">
        {pending ? "Saving…" : operationId ? "Save changes" : "Create operation"}
      </button>
    </form>
  );
}
