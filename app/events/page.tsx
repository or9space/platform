import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listUpcomingEvents, listPastEvents, type EventRow } from "@/lib/queries/events";
import { formatDateTime } from "@/lib/format";
import { EventTypeBadge } from "@/components/events/event-type-badge";

function EventList({ events }: { events: EventRow[] }) {
  if (events.length === 0) return <p className="text-sm text-neutral-500">Nothing here yet.</p>;
  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.id}>
          <a
            href={`/events/${e.id}`}
            className="flex items-center justify-between gap-4 rounded border border-neutral-800 p-4 transition-colors hover:border-neutral-600"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <EventTypeBadge type={e.type} />
                <p className="truncate font-medium text-neutral-100">{e.title}</p>
              </div>
              <p className="mt-1 text-sm text-neutral-400">
                {formatDateTime(e.startsAt)}
                {e.location ? ` · ${e.location}` : ""}
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs text-neutral-500">{e.goingCount} going</span>
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
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        {canManage && (
          <a href="/events/new" className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900">
            New event
          </a>
        )}
      </div>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-neutral-500">[ Upcoming ]</h2>
        <EventList events={upcoming} />
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-neutral-500">[ Past ]</h2>
          <EventList events={past} />
        </section>
      )}
    </main>
  );
}
