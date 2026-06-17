"use client";

import { useState, useTransition } from "react";
import {
  createProjectAction, deleteProjectAction, createTicketAction,
  setTicketStatusAction, assignTicketAction, deleteTicketAction,
} from "@/lib/actions/projects";

const field = "w-full border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none";
const STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

function reloadOnOk(start: ReturnType<typeof useTransition>[1], fn: () => Promise<{ ok: boolean }>) {
  start(async () => { const r = await fn(); if (r.ok) window.location.reload(); });
}

export function ProjectCreateForm() {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = { name: String(fd.get("name") ?? ""), description: String(fd.get("description") ?? "") || null };
    start(async () => { const r = await createProjectAction(input); if (!r.ok) { setError(r.error); return; } window.location.reload(); });
  }
  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="border border-border-light bg-surface-elevated px-3 py-1.5 text-sm font-semibold text-text-secondary hover:border-primary hover:text-primary transition-colors mfd-label"
    >
      + NEW BOARD
    </button>
  );
  return (
    <form action={submit} className="space-y-2 border border-border bg-surface p-4">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <input name="name" required placeholder="Board name" maxLength={120} className={field} />
      <textarea name="description" rows={2} placeholder="Description (optional)" maxLength={2000} className={field} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="border border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary disabled:opacity-50 hover:bg-primary/20 transition-colors"
        >
          {pending ? "SAVING…" : "SAVE"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mfd-label text-sm hover:text-text-primary transition-colors"
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}

export function DeleteProjectButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return (
    <button
      onClick={() => setConfirming(true)}
      className="mfd-label text-xs hover:text-fg-red-light transition-colors"
    >
      DELETE BOARD
    </button>
  );
  return (
    <span className="flex items-center gap-2 text-xs">
      <button
        onClick={() => reloadOnOk(start, () => deleteProjectAction(id))}
        disabled={pending}
        className="mfd-label text-fg-red-light hover:opacity-80 transition-opacity"
      >
        CONFIRM
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="mfd-label hover:text-text-primary transition-colors"
      >
        CANCEL
      </button>
    </span>
  );
}

export function TicketCreateForm({ projectId }: { projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = { projectId, title: String(fd.get("title") ?? ""), description: String(fd.get("description") ?? "") || null };
    start(async () => { const r = await createTicketAction(input); if (!r.ok) { setError(r.error); return; } window.location.reload(); });
  }
  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="border border-border-light bg-surface-elevated px-3 py-1.5 text-sm font-semibold text-text-secondary hover:border-primary hover:text-primary transition-colors mfd-label"
    >
      + TICKET
    </button>
  );
  return (
    <form action={submit} className="space-y-2 border border-border bg-surface p-3">
      {error && <p className="text-xs text-fg-red-light">{error}</p>}
      <input name="title" required placeholder="Ticket title" maxLength={200} className={field} />
      <textarea name="description" rows={2} placeholder="Details (optional)" maxLength={5000} className={field} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="border border-primary bg-primary/10 px-2 py-1 text-xs font-semibold text-primary disabled:opacity-50 hover:bg-primary/20 transition-colors"
        >
          {pending ? "…" : "ADD"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mfd-label text-xs hover:text-text-primary transition-colors"
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}

export function TicketCard({
  projectId, id, title, description, status, assigneeName, canDelete,
}: {
  projectId: string; id: string; title: string; description: string | null;
  status: string; assigneeName: string | null; canDelete: boolean;
}) {
  const [pending, start] = useTransition();
  const [assigning, setAssigning] = useState(false);
  return (
    <div className="border border-border bg-surface/40 p-3">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && <p className="mt-1 text-xs text-text-secondary">{description}</p>}
      <p className="mt-1 mfd-label text-xs">
        {assigneeName ? `@${assigneeName}` : "UNASSIGNED"}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => reloadOnOk(start, () => setTicketStatusAction(projectId, id, e.target.value))}
          disabled={pending}
          className="border border-border-light bg-surface px-1.5 py-0.5 text-xs text-text-primary focus:border-primary focus:outline-none"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <button
          onClick={() => setAssigning((v) => !v)}
          className="mfd-label text-xs hover:text-primary transition-colors"
        >
          ASSIGN
        </button>
        {canDelete && (
          <button
            onClick={() => reloadOnOk(start, () => deleteTicketAction(projectId, id))}
            disabled={pending}
            className="mfd-label text-xs text-fg-red-light hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            DELETE
          </button>
        )}
      </div>
      {assigning && (
        <form
          action={(fd) => reloadOnOk(start, () => assignTicketAction(projectId, id, String(fd.get("username") ?? "") || null))}
          className="mt-2 flex items-center gap-1"
        >
          <input
            name="username"
            placeholder="username (blank=unassign)"
            maxLength={60}
            className="w-40 border border-border-light bg-surface px-2 py-0.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="border border-primary bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary disabled:opacity-50 hover:bg-primary/20 transition-colors"
          >
            SET
          </button>
        </form>
      )}
    </div>
  );
}
