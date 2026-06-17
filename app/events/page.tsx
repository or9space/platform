import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listUpcomingEvents, listPastEvents, type EventRow } from "@/lib/queries/events";
import { formatDateTime } from "@/lib/format";
import { EventTypeBadge } from "@/components/events/event-type-badge";
import { MfdPanel } from "@/components/ui/mfd";
import { Calendar } from "lucide-react";

function EventList({ events }: { events: EventRow[] }) {
  if (events.length === 0)
    return <p className="text-sm text-text-muted">Nothing here yet.</p>;
  return (
    <ul className="space-y-2">
      {events.map((e) => (
        <li key={e.id}>
          <a
            href={`/events/${e.id}`}
            className="flex items-center justify-between gap-4 border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary mfd-cut-tl-br"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <EventTypeBadge type={e.type} />
                <p className="truncate font-medium text-text-primary">{e.title}</p>
              </div>
              <p className="mt-0.5 text-sm text-text-secondary">
                {formatDateTime(e.startsAt)}
                {e.location ? ` · ${e.location}` : ""}
              </p>
            </div>
            <span className="mfd-label shrink-0">{e.goingCount} going</span>
          </a>
        </li>
      ))}
    </ul>
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
        <EventList events={upcoming} />
      </MfdPanel>

      {/* Past events panel */}
      {past.length > 0 && (
        <MfdPanel
          chassis="neutral"
          title={<span>[ PAST EVENTS ]</span>}
          titleAside={<span className="mfd-label">{past.length} records</span>}
          bodyPadding="sm"
        >
          <EventList events={past} />
        </MfdPanel>
      )}
    </div>
  );
}
