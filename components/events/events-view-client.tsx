"use client";

import { useState } from "react";
import { Clock, MapPin, Users } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";
import { EventTypeBadge } from "@/components/events/event-type-badge";
import { CalendarGrid, type CalendarEventRow } from "@/components/events/calendar-grid";

// Serialised shape used for upcoming / past lists (all dates are ISO strings)
export interface SerialisedEventRow {
  id: string;
  title: string;
  type: string;
  startsAt: string; // ISO string
  endsAt: string | null;
  location: string | null;
  goingCount: number;
}

// ---- List helpers ----

function groupByDate(
  events: SerialisedEventRow[],
): { label: string; items: SerialisedEventRow[] }[] {
  const map = new Map<string, SerialisedEventRow[]>();
  for (const e of events) {
    const key = new Date(e.startsAt).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
    const bucket = map.get(key);
    if (bucket) bucket.push(e);
    else map.set(key, [e]);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function EventCard({ e }: { e: SerialisedEventRow }) {
  const d = new Date(e.startsAt);
  return (
    <a
      href={`/events/${e.id}`}
      className="flex items-center justify-between gap-4 border border-border bg-surface px-4 py-3 transition-colors hover:border-primary mfd-cut-tl-br"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <EventTypeBadge type={e.type} />
          <p className="truncate font-medium text-text-primary">{e.title}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {d.toLocaleString(undefined, {
              weekday: "short", month: "short", day: "numeric",
              year: "numeric", hour: "numeric", minute: "2-digit",
            })}
          </span>
          {e.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {e.location}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-sm text-text-muted">
        <Users className="h-4 w-4" />
        <span className="mfd-label">{e.goingCount}</span>
      </div>
    </a>
  );
}

function GroupedEventList({ events }: { events: SerialisedEventRow[] }) {
  if (events.length === 0)
    return <p className="text-sm text-text-muted">Nothing here yet.</p>;
  const groups = groupByDate(events);
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
            {g.label}
          </p>
          <ul className="space-y-2">
            {g.items.map((e) => (
              <li key={e.id}>
                <EventCard e={e} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---- Main client island ----

interface EventsViewClientProps {
  monthEvents: CalendarEventRow[];
  initialMonth: number;
  initialYear: number;
  upcoming: SerialisedEventRow[];
  past: SerialisedEventRow[];
}

type View = "grid" | "list";

export function EventsViewClient({
  monthEvents,
  initialMonth,
  initialYear,
  upcoming,
  past,
}: EventsViewClientProps) {
  const [view, setView] = useState<View>("grid");

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex items-center gap-1">
        {(["grid", "list"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={[
              "rounded border px-3 py-1 text-xs font-semibold uppercase tracking-widest transition-colors",
              view === v
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-text-muted hover:border-border-light hover:text-text-secondary",
            ].join(" ")}
          >
            {v === "grid" ? "Grid" : "List"}
          </button>
        ))}
      </div>

      {view === "grid" ? (
        <CalendarGrid
          events={monthEvents}
          initialMonth={initialMonth}
          initialYear={initialYear}
        />
      ) : (
        <>
          <MfdPanel
            chassis="primary"
            title={<span>[ UPCOMING ]</span>}
            titleAside={<span className="mfd-readout text-sm">{upcoming.length}</span>}
            bodyPadding="sm"
          >
            <GroupedEventList events={upcoming} />
          </MfdPanel>

          {past.length > 0 && (
            <MfdPanel
              chassis="neutral"
              title={<span>[ PAST EVENTS ]</span>}
              titleAside={<span className="mfd-label">{past.length} records</span>}
              bodyPadding="sm"
            >
              <GroupedEventList events={past} />
            </MfdPanel>
          )}
        </>
      )}
    </div>
  );
}
