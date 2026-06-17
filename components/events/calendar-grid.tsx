"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";

// Mirrors the EventRow shape that page.tsx will serialize for the client
export interface CalendarEventRow {
  id: string;
  title: string;
  type: string;
  startsAt: string; // ISO string
  location: string | null;
  goingCount: number;
}

interface CalendarGridProps {
  /** All events pre-serialised to ISO strings. */
  events: CalendarEventRow[];
  initialMonth: number; // 0-indexed
  initialYear: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Type-color map — keeps parity with EventTypeBadge's STYLES keys
const TYPE_COLOR: Record<string, string> = {
  OP:         "#f87171", // red
  MEETING:    "#60a5fa", // blue
  TRAINING:   "#4ade80", // green
  SOCIAL:     "#94a3b8", // slate
  TOURNAMENT: "#fbbf24", // amber
  OTHER:      "#64748b", // muted slate
};

function colorFor(type: string): string {
  return TYPE_COLOR[type] ?? TYPE_COLOR.OTHER;
}

function isSameDay(iso: string, year: number, month: number, day: number): boolean {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? "p" : "a";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

export function CalendarGrid({ events, initialMonth, initialYear }: CalendarGridProps) {
  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build cells: leading nulls then day numbers
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Filter events to this month (client-side; page passes the full serialised list)
  const monthEvents = events.filter((e) => {
    const d = new Date(e.startsAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  function eventsForDay(day: number): CalendarEventRow[] {
    return monthEvents.filter(e => isSameDay(e.startsAt, year, month, day));
  }

  const isCurrentMonth = todayY === year && todayM === month;

  return (
    <MfdPanel
      chassis="primary"
      title={
        <div className="flex w-full items-center justify-between">
          <button
            aria-label="Previous month"
            onClick={prevMonth}
            className="rounded p-1 text-text-secondary hover:bg-surface-hover"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="mfd-label text-sm font-semibold text-text-primary">
            {MONTHS[month]} {year}
          </span>
          <button
            aria-label="Next month"
            onClick={nextMonth}
            className="rounded p-1 text-text-secondary hover:bg-surface-hover"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      }
      bodyPadding="none"
    >
      {/* Type legend */}
      <div className="flex flex-wrap gap-3 border-b border-border/60 px-3 py-2">
        {Object.entries(TYPE_COLOR).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] uppercase tracking-wide text-text-muted">{type}</span>
          </div>
        ))}
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border/60">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[10px] font-semibold uppercase tracking-widest text-text-muted"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const dayEvents = day ? eventsForDay(day) : [];
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - 3;
          const isToday = isCurrentMonth && day === todayD;

          return (
            <div
              key={idx}
              className={[
                "min-h-[90px] border-b border-r border-border/40 p-1",
                !day ? "bg-black/20" : "",
              ].join(" ")}
            >
              {day && (
                <>
                  {/* Day number */}
                  <span
                    className={[
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                      isToday
                        ? "bg-primary font-bold text-white"
                        : "text-text-secondary",
                    ].join(" ")}
                  >
                    {day}
                  </span>

                  {/* Mobile: dots */}
                  <div className="mt-0.5 flex flex-wrap gap-0.5 sm:hidden">
                    {dayEvents.map((e) => (
                      <span
                        key={e.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: colorFor(e.type) }}
                        title={e.title}
                      />
                    ))}
                  </div>

                  {/* Desktop: event pills */}
                  <div className="mt-0.5 hidden flex-col gap-px sm:flex">
                    {visible.map((e) => (
                      <a
                        key={e.id}
                        href={`/events/${e.id}`}
                        className="group flex items-center overflow-hidden rounded text-[10px] leading-tight hover:bg-surface-hover"
                      >
                        <span
                          className="w-0.5 shrink-0 self-stretch rounded-l"
                          style={{ backgroundColor: colorFor(e.type) }}
                        />
                        <span className="truncate px-1 py-px text-text-secondary group-hover:text-text-primary">
                          {formatTime(e.startsAt)} {e.title}
                        </span>
                      </a>
                    ))}
                    {overflow > 0 && (
                      <span className="px-1 text-[10px] text-text-muted">
                        +{overflow} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </MfdPanel>
  );
}
