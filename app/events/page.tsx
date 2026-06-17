import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listUpcomingEvents, listPastEvents, listEventsByMonth, type EventRow } from "@/lib/queries/events";
import { EventsViewClient, type SerialisedEventRow } from "@/components/events/events-view-client";
import { PageHeader } from "@/components/ui/page-header";
import { Calendar } from "lucide-react";

function serialise(e: EventRow): SerialisedEventRow {
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    location: e.location,
    goingCount: e.goingCount,
  };
}

export default async function EventsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const { tenant } = ctx;

  const viewer = await getViewerMembership(tenant.id, await getSessionAccountId());
  const canManage = viewer ? hasTier(viewer.tier, "OFFICER") : false;

  const now = new Date();
  const tenantCtx = makeTenantContext(tenant.id);
  const [upcoming, past, monthEvents] = await Promise.all([
    listUpcomingEvents(tenantCtx, 50),
    listPastEvents(tenantCtx, 20),
    listEventsByMonth(tenantCtx, now.getFullYear(), now.getMonth()),
  ]);

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader
        icon={Calendar}
        title="Events"
        subtitle="MISSION CALENDAR"
        actions={canManage ? (
          <a
            href="/events/new"
            className="rounded border border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            + New Event
          </a>
        ) : undefined}
      />

      <EventsViewClient
        monthEvents={monthEvents.map((e) => ({
          id: e.id,
          title: e.title,
          type: e.type,
          startsAt: e.startsAt.toISOString(),
          location: e.location,
          goingCount: e.goingCount,
        }))}
        initialMonth={now.getMonth()}
        initialYear={now.getFullYear()}
        upcoming={upcoming.map(serialise)}
        past={past.map(serialise)}
      />
    </div>
  );
}
