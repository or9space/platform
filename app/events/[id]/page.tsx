import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getEvent, getMyRsvp } from "@/lib/queries/events";
import { formatDateTime } from "@/lib/format";
import { EventTypeBadge } from "@/components/events/event-type-badge";
import { RsvpButtons } from "@/components/events/rsvp-buttons";
import { DeleteEventButton } from "@/components/events/delete-event-button";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const { tenant } = ctx;

  const viewer = await getViewerMembership(tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const canManage = hasTier(viewer.tier, "OFFICER");

  const { id } = await params;
  const tenantCtx = makeTenantContext(tenant.id);
  const event = await getEvent(tenantCtx, id);
  if (!event) notFound();
  const myRsvp = await getMyRsvp(tenantCtx, id, viewer.id);

  const going = event.rsvps.filter((r) => r.status === "GOING");
  const maybe = event.rsvps.filter((r) => r.status === "MAYBE");

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <a href="/events" className="text-sm text-neutral-400 underline hover:text-neutral-100">← Events</a>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <EventTypeBadge type={event.type} />
              <h1 className="text-2xl font-bold">{event.title}</h1>
            </div>
            <p className="mt-2 text-neutral-300">{formatDateTime(event.startsAt)}{event.endsAt ? ` – ${formatDateTime(event.endsAt)}` : ""}</p>
            {event.location && <p className="text-sm text-neutral-400">{event.location}</p>}
            <p className="mt-1 text-xs text-neutral-500">Created by {event.createdByName}</p>
          </div>
          {canManage && (
            <div className="flex shrink-0 items-center gap-2">
              <a href={`/events/${event.id}/edit`} className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500">Edit</a>
              <DeleteEventButton eventId={event.id} />
            </div>
          )}
        </div>
      </div>

      {event.description && (
        <p className="whitespace-pre-wrap text-neutral-200">{event.description}</p>
      )}

      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-widest text-neutral-500">[ Your RSVP ]</h2>
        <RsvpButtons eventId={event.id} current={myRsvp} />
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-neutral-500">
            [ Going · {event.counts.GOING} ]
          </h2>
          {going.length === 0 ? (
            <p className="text-sm text-neutral-500">No one yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {going.map((r) => (
                <li key={r.membershipId}>
                  <a href={`/members/${r.username}`} className="text-neutral-200 hover:underline">{r.name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-neutral-500">
            [ Maybe · {event.counts.MAYBE} ]
          </h2>
          {maybe.length === 0 ? (
            <p className="text-sm text-neutral-500">No one yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {maybe.map((r) => (
                <li key={r.membershipId}>
                  <a href={`/members/${r.username}`} className="text-neutral-200 hover:underline">{r.name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
