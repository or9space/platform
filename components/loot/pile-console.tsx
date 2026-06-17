"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { spendLootAction } from "@/lib/actions/loot";
import { formatPoints } from "@/lib/loot";
import { MfdPanel, MfdReadout } from "@/components/ui/mfd";
import type { LootMemberBalance } from "@/lib/queries/loot";

// ---------------------------------------------------------------------------
// MemberPicker — search-as-you-type combobox
// ---------------------------------------------------------------------------

interface MemberPickerProps {
  members: LootMemberBalance[];
  onPick: (member: LootMemberBalance) => void;
  selected: LootMemberBalance | null;
}

function MemberPicker({ members, onPick, selected }: MemberPickerProps) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const listboxId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...members].sort(
      (a, b) =>
        b.balanceTenths - a.balanceTenths ||
        a.displayName.localeCompare(b.displayName),
    );
    if (!q) return sorted.slice(0, 8);
    return sorted
      .filter((m) => m.displayName.toLowerCase().includes(q))
      .slice(0, 12);
  }, [members, query]);

  function commit(m: LootMemberBalance) {
    onPick(m);
    setQuery("");
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[activeIdx];
      if (pick) commit(pick);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const placeholder = selected
    ? selected.displayName
    : "search member…";

  return (
    <div className="relative">
      <label htmlFor={inputId} className="mfd-label text-text-muted block mb-1">
        Member
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-autocomplete="list"
        aria-activedescendant={
          open && filtered[activeIdx] ? `${listboxId}-${activeIdx}` : undefined
        }
        value={selected && !open ? "" : query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIdx(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={onKey}
        className="w-full border border-border bg-surface-elevated px-3 py-3 text-base text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
      {open && filtered.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto border border-border bg-surface shadow-lg"
        >
          {filtered.map((m, i) => {
            const active = i === activeIdx;
            return (
              <li
                key={m.id}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(m);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={
                  "flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer " +
                  (active ? "bg-primary/15" : "")
                }
              >
                <span className="truncate text-sm text-text-primary">
                  {m.displayName}
                </span>
                <span className="font-mono tabular-nums text-sm text-primary">
                  {formatPoints(m.balanceTenths)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {open && filtered.length === 0 && (
        <p className="absolute left-0 right-0 mt-1 border border-border bg-surface px-3 py-2 text-sm text-text-muted">
          No match.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecentRow — in-memory spend trail
// ---------------------------------------------------------------------------

interface RecentRow {
  key: string;
  displayName: string;
  amountTenths: number;
  note: string;
  at: number;
}

// ---------------------------------------------------------------------------
// PileConsole — main officer spend interface
// ---------------------------------------------------------------------------

export interface PileConsoleMember {
  id: string;
  displayName: string;
  membershipId: string | null;
  balanceTenths: number;
}

interface Props {
  members: PileConsoleMember[];
}

export function PileConsole({ members }: Props) {
  const [picked, setPicked] = useState<PileConsoleMember | null>(null);
  // amountTenths — stepper value; default 10 (= 1 point)
  const [amountTenths, setAmountTenths] = useState(10);
  const [note, setNote] = useState("");
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const insufficient =
    picked != null && amountTenths > picked.balanceTenths;

  function bump(deltaTenths: number) {
    setAmountTenths((a) => Math.max(1, a + deltaTenths));
  }

  function handleSpend() {
    setError(null);
    if (!picked) {
      setError("Pick a member first.");
      return;
    }
    if (amountTenths <= 0) {
      setError("Amount must be positive.");
      return;
    }
    if (insufficient) {
      setError(`${picked.displayName} only has ${formatPoints(picked.balanceTenths)} pts.`);
      return;
    }

    startTransition(async () => {
      const r = await spendLootAction({
        memberId: picked.id,
        amountTenths,
        note: note.trim() || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      // Optimistically update the in-memory recent feed and reset stepper.
      setRecent((prev) =>
        [
          {
            key: `${picked.id}-${Date.now()}`,
            displayName: picked.displayName,
            amountTenths,
            note: note.trim(),
            at: Date.now(),
          },
          ...prev,
        ].slice(0, 10),
      );
      // Optimistically reduce the picked member's balance in the list.
      setPicked((prev) =>
        prev
          ? { ...prev, balanceTenths: prev.balanceTenths - amountTenths }
          : null,
      );
      setNote("");
      setAmountTenths(10);
    });
  }

  return (
    <div className="space-y-5">
      {/* Member picker */}
      <MfdPanel title="[ Select member ]" bodyPadding="sm">
        <MemberPicker members={members} onPick={setPicked} selected={picked} />
        {picked && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
            <MfdReadout
              label="Balance"
              value={formatPoints(picked.balanceTenths)}
              tone="amber"
              size="lg"
            />
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              clear
            </button>
          </div>
        )}
      </MfdPanel>

      {/* Stepper */}
      <MfdPanel title="[ Spend amount ]" bodyPadding="sm">
        <div className="flex items-stretch justify-between gap-3">
          <button
            type="button"
            onClick={() => bump(-10)}
            aria-label="Decrease by 1"
            className="h-16 w-16 border border-border bg-surface-elevated text-3xl text-text-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            −
          </button>
          <div className="flex flex-1 flex-col items-center justify-center border border-border bg-surface py-2">
            <span className="font-mono tabular-nums text-4xl font-bold text-primary leading-none">
              {formatPoints(amountTenths)}
            </span>
            <span className="mfd-label text-text-muted mt-1">pts</span>
          </div>
          <button
            type="button"
            onClick={() => bump(10)}
            aria-label="Increase by 1"
            className="h-16 w-16 border border-border bg-surface-elevated text-3xl text-text-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            +
          </button>
        </div>
        {/* Fine-grain half-point controls */}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => bump(-5)}
            className="flex-1 border border-border/60 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover"
          >
            −0.5
          </button>
          <button
            type="button"
            onClick={() => bump(5)}
            className="flex-1 border border-border/60 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover"
          >
            +0.5
          </button>
        </div>
      </MfdPanel>

      {/* Optional note */}
      <div>
        <label className="mfd-label text-text-muted block mb-1">
          Note (optional)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Item or reason…"
          maxLength={500}
          disabled={pending}
          className="w-full border border-border bg-surface-elevated px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        />
      </div>

      {/* Error */}
      {(error || (insufficient && picked)) && (
        <p role="alert" className="text-sm text-fg-red">
          {error ??
            `Insufficient balance: ${formatPoints(picked?.balanceTenths ?? 0)} pts available`}
        </p>
      )}

      {/* Primary CTA */}
      <button
        type="button"
        onClick={handleSpend}
        disabled={pending || !picked || insufficient}
        className="w-full bg-primary py-4 text-stencil text-lg text-fg-cream hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-40 transition-colors motion-reduce:transition-none"
      >
        {pending ? "Recording…" : "SPEND"}
      </button>

      {/* Recent-spends trail */}
      {recent.length > 0 && (
        <section aria-label="Recent spends">
          <p className="mfd-label text-text-muted mb-2">[ Recent spends ]</p>
          <ul className="divide-y divide-border/60 border-y border-border/60">
            {recent.map((r) => (
              <li
                key={r.key}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate text-text-primary">
                  {r.displayName}
                  {r.note && (
                    <>
                      {" "}
                      <span className="text-text-muted">·</span>{" "}
                      <span className="text-text-secondary">{r.note}</span>
                    </>
                  )}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-fg-red">
                  −{formatPoints(r.amountTenths)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
