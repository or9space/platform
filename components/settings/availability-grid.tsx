"use client";

import { useState, useCallback, useTransition } from "react";
import { updateAvailabilityAction } from "@/lib/actions/profile";
import type { AvailabilityGrid } from "@/lib/actions/profile-core";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type DayKey = (typeof DAY_KEYS)[number];
const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourLabel(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function gridFromAvailability(availability: AvailabilityGrid | null): Set<string> {
  const active = new Set<string>();
  if (!availability) return active;
  for (const day of DAY_KEYS) {
    const blocks = availability[day];
    if (!Array.isArray(blocks)) continue;
    for (const h of blocks) {
      active.add(`${day}-${h}`);
    }
  }
  return active;
}

function gridToAvailability(active: Set<string>): AvailabilityGrid {
  const result: AvailabilityGrid = {};
  for (const day of DAY_KEYS) {
    const hours: number[] = [];
    for (const h of HOURS) {
      if (active.has(`${day}-${h}`)) hours.push(h);
    }
    if (hours.length > 0) result[day] = hours;
  }
  return result;
}

export function SettingsAvailabilityGrid({
  initialAvailability,
}: {
  initialAvailability: AvailabilityGrid | null;
}) {
  const [activeCells, setActiveCells] = useState<Set<string>>(() =>
    gridFromAvailability(initialAvailability),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggleCell = useCallback((day: DayKey, hour: number, value: boolean) => {
    setActiveCells((prev) => {
      const next = new Set(prev);
      const key = `${day}-${hour}`;
      if (value) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
    setMsg(null);
  }, []);

  const handleMouseDown = (day: DayKey, hour: number) => {
    const key = `${day}-${hour}`;
    const newValue = !activeCells.has(key);
    setIsDragging(true);
    setDragValue(newValue);
    toggleCell(day, hour, newValue);
  };

  const handleMouseEnter = (day: DayKey, hour: number) => {
    if (!isDragging) return;
    toggleCell(day, hour, dragValue);
  };

  const handleMouseUp = () => setIsDragging(false);

  function handleSave() {
    setMsg(null);
    setError(null);
    const availability = gridToAvailability(activeCells);
    start(async () => {
      const r = await updateAvailabilityAction(
        Object.keys(availability).length > 0 ? availability : null,
      );
      if (!r.ok) { setError(r.error); return; }
      setMsg("Saved.");
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-muted">
        Click or drag to toggle hour blocks. Highlighted blocks indicate when you&apos;re typically available.
      </p>

      <div
        className="select-none overflow-x-auto"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-10 px-1 py-1 text-right text-text-muted font-medium" />
              {HOURS.map((h) => (
                <th
                  key={h}
                  className="px-0.5 py-1 text-center text-text-muted font-medium min-w-[26px]"
                >
                  {h % 4 === 0 ? hourLabel(h) : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_KEYS.map((day) => (
              <tr key={day}>
                <td className="px-1 py-0.5 text-right text-text-muted font-medium">
                  {DAY_LABELS[day]}
                </td>
                {HOURS.map((h) => {
                  const key = `${day}-${h}`;
                  const isActive = activeCells.has(key);
                  return (
                    <td
                      key={h}
                      className="cursor-pointer border border-border/30 px-0 py-0"
                      onMouseDown={() => handleMouseDown(day, h)}
                      onMouseEnter={() => handleMouseEnter(day, h)}
                    >
                      <div
                        className={`h-6 w-full transition-colors ${
                          isActive
                            ? "bg-primary/60"
                            : "bg-surface-elevated hover:bg-surface-hover"
                        }`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50 hover:bg-primary/20 transition-colors"
      >
        {pending ? "SAVING…" : "SAVE SCHEDULE"}
      </button>
    </div>
  );
}
