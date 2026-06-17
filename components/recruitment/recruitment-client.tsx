"use client";

import { useState, useTransition } from "react";
import {
  submitApplicationAction, approveApplicationAction, rejectApplicationAction,
} from "@/lib/actions/recruitment";

const field = "w-full border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none";

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
      <div className="border border-primary/40 bg-primary/10 p-4 text-sm text-primary">
        <span className="mfd-label block">APPLICATION RECEIVED</span>
        <p className="mt-1 text-text-secondary">
          Application sent to {orgName}. An officer will review it — if approved, you&apos;ll get a link to set your password and sign in.
        </p>
      </div>
    );
  }
  return (
    <form action={submit} className="space-y-3 border border-border bg-surface/30 p-4">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <label className="block text-sm">
        <span className="mfd-label">DESIRED HANDLE</span>
        <input name="handle" required placeholder="e.g. nova_pilot" maxLength={32} className={field} />
      </label>
      <label className="block text-sm">
        <span className="mfd-label">EMAIL</span>
        <input name="email" type="email" required placeholder="you@example.com" maxLength={200} className={field} />
      </label>
      <label className="block text-sm">
        <span className="mfd-label">NAME / CONTACT (OPTIONAL)</span>
        <input name="contactName" placeholder="Discord, real name…" maxLength={120} className={field} />
      </label>
      <label className="block text-sm">
        <span className="mfd-label">WHY DO YOU WANT TO JOIN?</span>
        <textarea name="message" required rows={5} placeholder="Tell us about yourself, your experience, timezone…" maxLength={4000} className={field} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50 hover:bg-primary/20 transition-colors"
      >
        {pending ? "SENDING…" : "SUBMIT APPLICATION"}
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

  const isApproved = app.status === "APPROVED";

  return (
    <li className={`border border-border bg-surface p-4 ${isApproved ? "bg-primary/10 border-primary/30" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-text-primary">
          @{app.handle}{" "}
          <span className="font-normal text-text-muted mfd-label">· {app.email}</span>
        </p>
        <StatusBadge status={app.status} />
      </div>
      {app.contactName && (
        <p className="mt-1 mfd-label text-xs">CONTACT: {app.contactName}</p>
      )}
      <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{app.message}</p>
      {app.reviewNote && (
        <p className="mt-2 mfd-label text-xs">NOTE: {app.reviewNote}</p>
      )}
      {!isPending && app.reviewedByName && (
        <p className="mt-1 mfd-label text-xs">REVIEWED BY @{app.reviewedByName}</p>
      )}

      {error && <p className="mt-2 text-sm text-fg-red-light">{error}</p>}

      {link && (
        <div className="mt-3 border border-primary/40 bg-primary/10 p-3 text-xs text-primary">
          <p className="mfd-label font-semibold">APPROVED — SHARE ONE-TIME LINK WITH APPLICANT:</p>
          <code className="mt-1 block break-all border border-border-light bg-surface p-2 font-mono text-text-secondary">{link}</code>
          <button
            onClick={() => navigator.clipboard?.writeText(link)}
            className="mt-2 border border-primary bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            COPY LINK
          </button>
        </div>
      )}

      {isPending && !link && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={approve}
            disabled={pending}
            className="border border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary disabled:opacity-50 hover:bg-primary/20 transition-colors"
          >
            APPROVE
          </button>
          <button
            onClick={() => setRejecting((v) => !v)}
            disabled={pending}
            className="mfd-label text-sm text-fg-red-light hover:opacity-80 transition-opacity"
          >
            REJECT
          </button>
        </div>
      )}
      {isPending && rejecting && !link && (
        <form action={reject} className="mt-2 flex flex-wrap items-center gap-2">
          <input
            name="note"
            placeholder="Reason (optional)"
            maxLength={500}
            className="flex-1 border border-border-light bg-surface px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="border border-danger bg-danger/10 px-3 py-1 text-xs font-semibold text-fg-red-light disabled:opacity-50 hover:bg-danger/20 transition-colors"
          >
            CONFIRM REJECT
          </button>
        </form>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "PENDING" ? "bg-amber-soft text-amber"
    : status === "APPROVED" ? "bg-primary/20 text-primary"
    : "bg-danger/20 text-fg-red-light";
  return (
    <span className={`mfd-label px-2 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>
  );
}

export interface ReviewApp {
  id: string; handle: string; email: string; contactName: string | null;
  message: string; status: string; reviewNote: string | null; reviewedByName: string | null;
}

export function ReviewList({ apps }: { apps: ReviewApp[] }) {
  if (apps.length === 0) return (
    <p className="mfd-label py-8 text-center">NO APPLICATIONS ON RECORD</p>
  );
  return <ul className="space-y-3">{apps.map((a) => <ApplicationCard key={a.id} app={a} />)}</ul>;
}
