"use client";

import { useState, useTransition } from "react";
import {
  submitApplicationAction, approveApplicationAction, rejectApplicationAction,
} from "@/lib/actions/recruitment";

const field = "w-full rounded border border-border-light bg-surface p-2 text-sm";

export function ApplyForm({ orgName }: { orgName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const input = {
      handle: String(fd.get("handle") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      contactName: String(fd.get("contactName") ?? "").trim() || null,
      message: String(fd.get("message") ?? "").trim(),
    };
    start(async () => {
      const r = await submitApplicationAction(input);
      if (!r.ok) { setError(r.error); return; }
      setDone(true);
    });
  }
  if (done) {
    return (
      <div className="rounded border border-border bg-surface/30 p-4 text-sm text-success">
        Application sent to {orgName}. An officer will review it — if approved, you&apos;ll get a link to set your password and sign in.
      </div>
    );
  }
  return (
    <form action={submit} className="space-y-3 rounded border border-border p-4">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <label className="block text-sm">
        <span className="text-text-secondary">Desired handle</span>
        <input name="handle" required placeholder="e.g. nova_pilot" maxLength={32} className={field} />
      </label>
      <label className="block text-sm">
        <span className="text-text-secondary">Email</span>
        <input name="email" type="email" required placeholder="you@example.com" maxLength={200} className={field} />
      </label>
      <label className="block text-sm">
        <span className="text-text-secondary">Name / contact (optional)</span>
        <input name="contactName" placeholder="Discord, real name…" maxLength={120} className={field} />
      </label>
      <label className="block text-sm">
        <span className="text-text-secondary">Why do you want to join?</span>
        <textarea name="message" required rows={5} placeholder="Tell us about yourself, your experience, timezone…" maxLength={4000} className={field} />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream disabled:opacity-50">
        {pending ? "Sending…" : "Submit application"}
      </button>
    </form>
  );
}

function ApplicationCard({ app }: { app: ReviewApp }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const isPending = app.status === "PENDING";

  function approve() {
    if (pending) return;
    setError(null);
    start(async () => {
      const r = await approveApplicationAction(app.id);
      if (!r.ok) { setError(r.error); return; }
      setLink(`${window.location.origin}${r.setPasswordPath}`);
    });
  }
  function reject(fd: FormData) {
    if (pending) return;
    setError(null);
    const note = String(fd.get("note") ?? "").trim() || null;
    start(async () => {
      const r = await rejectApplicationAction(app.id, note);
      if (!r.ok) { setError(r.error); return; }
      window.location.reload();
    });
  }

  return (
    <li className="rounded border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-text-primary">@{app.handle} <span className="font-normal text-text-muted">· {app.email}</span></p>
        <StatusBadge status={app.status} />
      </div>
      {app.contactName && <p className="mt-1 text-xs text-text-muted">Contact: {app.contactName}</p>}
      <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{app.message}</p>
      {app.reviewNote && <p className="mt-2 text-xs text-text-muted">Note: {app.reviewNote}</p>}
      {!isPending && app.reviewedByName && (
        <p className="mt-1 text-xs text-text-muted">Reviewed by @{app.reviewedByName}</p>
      )}

      {error && <p className="mt-2 text-sm text-fg-red-light">{error}</p>}

      {link && (
        <div className="mt-3 rounded border border-border bg-surface/30 p-3 text-xs text-success">
          <p className="font-semibold">Approved — share this one-time set-password link with the applicant:</p>
          <code className="mt-1 block break-all rounded bg-black/40 p-2 font-mono">{link}</code>
          <button onClick={() => navigator.clipboard?.writeText(link)} className="mt-2 rounded bg-success px-2 py-1 font-semibold text-fg-black">Copy link</button>
        </div>
      )}

      {isPending && !link && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={approve} disabled={pending} className="rounded bg-success/90 px-3 py-1.5 text-sm font-semibold text-fg-black disabled:opacity-50">Approve</button>
          <button onClick={() => setRejecting((v) => !v)} disabled={pending} className="text-sm text-fg-red-light hover:text-fg-red-light">Reject</button>
        </div>
      )}
      {isPending && rejecting && !link && (
        <form action={reject} className="mt-2 flex flex-wrap items-center gap-2">
          <input name="note" placeholder="Reason (optional)" maxLength={500} className="flex-1 rounded border border-border-light bg-surface px-2 py-1 text-xs" />
          <button type="submit" disabled={pending} className="rounded bg-danger/90 px-3 py-1 text-xs font-semibold text-fg-cream disabled:opacity-50">Confirm reject</button>
        </form>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "PENDING" ? "bg-amber-soft text-amber"
    : status === "APPROVED" ? "bg-success/20 text-success"
    : "bg-danger/20 text-fg-red-light";
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
}

export interface ReviewApp {
  id: string; handle: string; email: string; contactName: string | null;
  message: string; status: string; reviewNote: string | null; reviewedByName: string | null;
}

export function ReviewList({ apps }: { apps: ReviewApp[] }) {
  if (apps.length === 0) return <p className="text-sm text-text-muted">No applications yet.</p>;
  return <ul className="space-y-3">{apps.map((a) => <ApplicationCard key={a.id} app={a} />)}</ul>;
}
