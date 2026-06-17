"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setTournamentStatusAction,
  addOfficerEntryAction,
  removeEntryAction,
  recordPlacementAction,
} from "@/lib/actions/tournaments";
import type { EntryRow } from "@/lib/queries/tournaments";

type TStatus = "DRAFT" | "OPEN" | "IN_PROGRESS" | "COMPLETE";

const STATUS_OPTIONS: { value: TStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETE", label: "Complete" },
];

interface Props {
  tournamentId: string;
  currentStatus: string;
  entries: EntryRow[];
}

export function ManageTournament({ tournamentId, currentStatus, entries }: Props) {
  const router = useRouter();

  // Status
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusPending, startStatusTransition] = useTransition();

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as TStatus;
    setStatusError(null);
    startStatusTransition(async () => {
      const r = await setTournamentStatusAction(tournamentId, next);
      if (!r.ok) {
        setStatusError(r.error);
        return;
      }
      router.refresh();
    });
  }

  // Add officer entry
  const [entryDisplayName, setEntryDisplayName] = useState("");
  const [entryMembershipId, setEntryMembershipId] = useState("");
  const [addEntryError, setAddEntryError] = useState<string | null>(null);
  const [addEntryPending, startAddEntryTransition] = useTransition();

  function handleAddEntry(formData: FormData) {
    if (addEntryPending) return;
    const dn = String(formData.get("displayName") ?? "").trim();
    const mid = String(formData.get("membershipId") ?? "").trim();
    if (!dn) {
      setAddEntryError("Display name is required.");
      return;
    }
    setAddEntryError(null);
    startAddEntryTransition(async () => {
      const r = await addOfficerEntryAction(tournamentId, dn, mid || undefined);
      if (!r.ok) {
        setAddEntryError(r.error);
        return;
      }
      setEntryDisplayName("");
      setEntryMembershipId("");
      router.refresh();
    });
  }

  // Per-entry remove/placement
  const [entryErrors, setEntryErrors] = useState<Record<string, string>>({});
  const [removePending, startRemoveTransition] = useTransition();
  const [placementPending, startPlacementTransition] = useTransition();
  const [placements, setPlacements] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const e of entries) {
      init[e.id] = e.placement != null ? String(e.placement) : "";
    }
    return init;
  });

  function handleRemove(entryId: string) {
    if (removePending) return;
    setEntryErrors((prev) => ({ ...prev, [entryId]: "" }));
    startRemoveTransition(async () => {
      const r = await removeEntryAction(entryId);
      if (!r.ok) {
        setEntryErrors((prev) => ({ ...prev, [entryId]: r.error }));
        return;
      }
      router.refresh();
    });
  }

  function handleRecordPlacement(entryId: string) {
    if (placementPending) return;
    const raw = placements[entryId] ?? "";
    const val = parseInt(raw, 10);
    if (!raw || isNaN(val) || val < 1) {
      setEntryErrors((prev) => ({ ...prev, [entryId]: "Enter a valid placement (≥ 1)." }));
      return;
    }
    setEntryErrors((prev) => ({ ...prev, [entryId]: "" }));
    startPlacementTransition(async () => {
      const r = await recordPlacementAction(entryId, val);
      if (!r.ok) {
        setEntryErrors((prev) => ({ ...prev, [entryId]: r.error }));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="rounded border border-border p-4">
        <h3 className="mb-3 font-semibold text-sm text-text-secondary">Status</h3>
        {statusError && <p className="mb-2 text-sm text-fg-red-light">{statusError}</p>}
        <label className="flex items-center gap-3 text-sm">
          <span className="text-text-secondary">Set status:</span>
          <select
            value={currentStatus}
            onChange={handleStatusChange}
            disabled={statusPending}
            className="rounded border border-border-light bg-surface px-3 py-1.5 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {statusPending && <span className="text-text-muted text-xs">Saving…</span>}
        </label>
      </div>

      {/* Add entry */}
      <div className="rounded border border-border p-4">
        <h3 className="mb-3 font-semibold text-sm text-text-secondary">Add entry</h3>
        <form action={handleAddEntry} className="flex flex-wrap gap-3 items-end">
          {addEntryError && <p className="w-full text-sm text-fg-red-light">{addEntryError}</p>}
          <label className="flex flex-col gap-1 text-sm flex-1 min-w-40">
            Display name
            <input
              name="displayName"
              type="text"
              value={entryDisplayName}
              onChange={(e) => setEntryDisplayName(e.target.value)}
              disabled={addEntryPending}
              placeholder="e.g. Player One…"
              maxLength={200}
              className="rounded border border-border-light bg-surface px-3 py-2 disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm flex-1 min-w-48">
            Membership ID (optional)
            <input
              name="membershipId"
              type="text"
              value={entryMembershipId}
              onChange={(e) => setEntryMembershipId(e.target.value)}
              disabled={addEntryPending}
              placeholder="Link to a member…"
              className="rounded border border-border-light bg-surface px-3 py-2 disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={addEntryPending}
            className="rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream disabled:opacity-50"
          >
            {addEntryPending ? "Adding…" : "Add entry"}
          </button>
        </form>
      </div>

      {/* Per-entry controls */}
      {entries.length > 0 && (
        <div className="rounded border border-border p-4">
          <h3 className="mb-3 font-semibold text-sm text-text-secondary">Entry controls</h3>
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center gap-3 rounded border border-border p-3"
              >
                <span className="flex-1 min-w-32 text-sm font-medium">{entry.displayName}</span>
                {entryErrors[entry.id] && (
                  <span className="w-full text-xs text-fg-red-light">{entryErrors[entry.id]}</span>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary">Place:</span>
                  <input
                    type="number"
                    min={1}
                    value={placements[entry.id] ?? ""}
                    onChange={(e) =>
                      setPlacements((prev) => ({ ...prev, [entry.id]: e.target.value }))
                    }
                    disabled={placementPending}
                    placeholder="#"
                    className="w-16 rounded border border-border-light bg-surface px-2 py-1 text-sm disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleRecordPlacement(entry.id)}
                    disabled={placementPending}
                    className="rounded border border-border-light px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                  >
                    Save
                  </button>
                </label>
                <button
                  type="button"
                  onClick={() => handleRemove(entry.id)}
                  disabled={removePending}
                  className="rounded border border-danger px-2 py-1 text-xs text-fg-red-light hover:bg-danger/30 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
