"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { MessageSquare } from "lucide-react";
import type { ConversationSummary, ConversationThread } from "@/lib/queries/messages";
import { startConversationAction, sendMessageAction, markReadAction } from "@/lib/actions/messages";

// ── helpers ───────────────────────────────────────────────────────────────────

function timeLabel(d: Date): string {
  const now = Date.now();
  const diff = now - new Date(d).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const input = "w-full rounded border border-border bg-surface-elevated p-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary";

// ── ConversationList ──────────────────────────────────────────────────────────

function ConversationList({
  conversations,
  activeId,
}: {
  conversations: ConversationSummary[];
  activeId?: string;
}) {
  return (
    <ul className="divide-y divide-border/40">
      {conversations.length === 0 && (
        <li className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <MessageSquare className="h-8 w-8 text-text-muted opacity-40" />
          <p className="mfd-label text-xs">NO CONVERSATIONS YET</p>
          <p className="text-xs text-text-muted">Start a new message to contact a member.</p>
        </li>
      )}
      {conversations.map((c) => (
        <li key={c.id}>
          <a
            href={`/messages/${c.id}`}
            className={[
              "flex items-start gap-3 px-4 py-3 transition-colors",
              activeId === c.id
                ? "bg-primary/10 border-l-2 border-l-primary"
                : "hover:bg-surface-elevated border-l-2 border-l-transparent",
            ].join(" ")}
          >
            {/* avatar placeholder */}
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold uppercase text-primary">
              {c.otherName.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-sm font-medium text-text-primary">{c.otherName}</span>
                <span className="shrink-0 text-xs text-text-muted">{timeLabel(c.lastMessageAt)}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-1">
                <p className="truncate text-xs text-text-muted">{c.lastMessage ?? "No messages yet"}</p>
                {c.unread > 0 && (
                  <span className="ml-1 shrink-0 rounded-full bg-success/20 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                    {c.unread}
                  </span>
                )}
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

// ── NewConversationForm (inline in pane) ──────────────────────────────────────

function NewConvForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    if (pending) return;
    setError(null);
    const username = String(fd.get("username") ?? "").trim();
    start(async () => {
      const r = await startConversationAction(username);
      if (!r.ok) { setError(r.error); return; }
      window.location.href = `/messages/${r.id}`;
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-fg-cream hover:bg-primary/90"
      >
        + New message
      </button>
    );
  }

  return (
    <form action={submit} className="flex flex-col gap-2">
      {error && <p className="text-xs text-fg-red-light">{error}</p>}
      <input name="username" required placeholder="Member username" maxLength={60} className={input} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-fg-cream disabled:opacity-50"
        >
          {pending ? "…" : "Start"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="text-xs text-text-muted hover:text-text-primary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── MessageBubbles ────────────────────────────────────────────────────────────

function MessageBubbles({ thread }: { thread: ConversationThread }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {thread.messages.length === 0 && (
        <p className="text-center text-xs text-text-muted py-8">No messages yet — say hello.</p>
      )}
      {thread.messages.map((m) => (
        <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[78%] ${m.mine ? "" : "flex items-end gap-2"}`}>
            {!m.mine && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold uppercase text-primary">
                {m.senderName.charAt(0)}
              </span>
            )}
            <div>
              {!m.mine && (
                <p className="mb-1 text-[10px] font-medium text-text-muted">{m.senderName}</p>
              )}
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  m.mine
                    ? "bg-primary text-fg-cream"
                    : "border border-border bg-surface text-text-primary"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
              <p className={`mt-0.5 text-[10px] text-text-muted ${m.mine ? "text-right" : ""}`}>
                {timeLabel(m.createdAt)}
              </p>
            </div>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────

function Composer({ conversationId }: { conversationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || pending) return;
    setError(null);
    start(async () => {
      const r = await sendMessageAction(conversationId, trimmed);
      if (!r.ok) { setError(r.error); return; }
      setBody("");
      // Server action revalidates /messages/[id]; force a reload so bubbles refresh
      window.location.reload();
    });
  }

  return (
    <form onSubmit={submit} className="shrink-0 border-t border-border/60 px-4 py-3 space-y-1.5">
      {error && <p className="text-xs text-fg-red-light">{error}</p>}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as unknown as React.FormEvent); }
          }}
          rows={2}
          required
          placeholder="Write a message… (Enter to send, Shift+Enter for newline)"
          maxLength={5000}
          className={`${input} resize-none`}
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="mb-0.5 rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream disabled:opacity-40"
        >
          {pending ? "…" : "Send"}
        </button>
      </div>
    </form>
  );
}

// ── TwoPaneMessages (main export) ─────────────────────────────────────────────

export interface TwoPaneMessagesProps {
  conversations: ConversationSummary[];
  thread?: ConversationThread | null;
  activeId?: string;
}

export function TwoPaneMessages({ conversations, thread, activeId }: TwoPaneMessagesProps) {
  // mark read on mount when we have a thread
  useEffect(() => {
    if (activeId) {
      markReadAction(activeId).catch(() => {/* best-effort */});
    }
  }, [activeId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden">
      {/* ── LEFT: conversation list ── */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border bg-surface">
        {/* list header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <span className="mfd-label flex items-center gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            [ CONVERSATIONS ]
          </span>
          <span className="mfd-readout text-xs">{conversations.length}</span>
        </div>
        {/* new conversation form */}
        <div className="border-b border-border/40 px-3 py-2">
          <NewConvForm />
        </div>
        {/* list body */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList conversations={conversations} activeId={activeId} />
        </div>
      </div>

      {/* ── RIGHT: thread or empty state ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {thread ? (
          <>
            {/* thread header */}
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold uppercase text-primary">
                {thread.otherName.charAt(0)}
              </span>
              <p className="font-semibold text-text-primary">{thread.otherName}</p>
            </div>
            {/* bubbles */}
            <MessageBubbles thread={thread} />
            {/* composer */}
            <Composer conversationId={thread.id} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-text-muted">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="text-xs">or start a new one using the button on the left</p>
          </div>
        )}
      </div>
    </div>
  );
}
