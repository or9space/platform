"use client";

import { useState, useTransition } from "react";
import { saveAarAction } from "@/lib/actions/operations";

export function AarEditor({
  operationId,
  initialAar,
  canManage,
}: {
  operationId: string;
  initialAar: string | null;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(!initialAar && canManage);
  const [draft, setDraft] = useState(initialAar ?? "");
  const [saved, setSaved] = useState(initialAar ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    if (pending) return;
    setError(null);
    start(async () => {
      const r = await saveAarAction(operationId, draft);
      if (!r.ok) { setError(r.error); return; }
      setSaved(draft);
      setEditing(false);
    });
  }

  const field = "mt-1 w-full rounded border border-border-light bg-surface p-2 text-sm font-mono";

  if (editing && canManage) {
    return (
      <div className="space-y-3">
        <textarea
          rows={8}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={20000}
          placeholder="Outcomes, lessons learned, recommendations…"
          className={field}
        />
        {error && <p className="text-xs text-fg-red-light">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={pending}
            className="rounded bg-primary px-3 py-1.5 font-mono text-xs text-fg-cream disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save report"}
          </button>
          {saved && (
            <button
              onClick={() => { setDraft(saved); setEditing(false); }}
              className="font-mono text-xs text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="space-y-3">
        <p className="whitespace-pre-wrap text-sm text-text-secondary leading-relaxed">{saved}</p>
        {canManage && (
          <button
            onClick={() => setEditing(true)}
            className="font-mono text-xs text-text-muted hover:text-primary transition-colors"
          >
            Edit report
          </button>
        )}
      </div>
    );
  }

  if (!canManage) {
    return <p className="text-sm text-text-muted">No report filed yet.</p>;
  }

  // No saved content + canManage: show form (handled above via editing=true initial state)
  return null;
}
