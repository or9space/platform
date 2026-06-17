import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listUpcomingEvents, listPastEvents, type EventRow } from "@/lib/queries/events";
import { formatDate, formatDateTime } from "@/lib/format";
import { EventTypeBadge } from "@/components/events/event-type-badge";
import { MfdPanel } from "@/components/ui/mfd";
import { Calendar, Clock, MapPin, Users } from "lucide-react";

// Group events by date label (e.g. "Jun 20 2026")
function groupByDate(events: EventRow[]): { label: string; items: EventRow[] }[] {
  const map = new Map<string, EventRow[]>();
  for (const e of events) {
    const key = formatDate(e.startsAt);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(e);
    } else {
      map.set(key, [e]);
    }
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function EventCard({ e }: { e: EventRow }) {
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
            {formatDateTime(e.startsAt)}
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

function GroupedEventList({ events }: { events: EventRow[] }) {
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

export default async function EventsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const { tenant } = ctx;

  const viewer = await getViewerMembership(tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const tenantCtx = makeTenantContext(tenant.id);
  const [upcoming, past] = await Promise.all([
    listUpcomingEvents(tenantCtx, 50),
    listPastEvents(tenantCtx, 20),
  ]);

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
            <Calendar className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Events</h1>
            <p className="text-sm text-text-muted">MISSION CALENDAR</p>
          </div>
        </div>
        {canManage && (
          <a
            href="/events/new"
            className="rounded border border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            + New Event
          </a>
        )}
      </div>

      {/* Upcoming events panel */}
      <MfdPanel
        chassis="primary"
        title={<span>[ UPCOMING ]</span>}
        titleAside={<span className="mfd-readout text-sm">{upcoming.length}</span>}
        bodyPadding="sm"
      >
        <GroupedEventList events={upcoming} />
      </MfdPanel>

      {/* Past events panel */}
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
    </div>
  );
}
