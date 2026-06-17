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
import { MfdPanel, MfdReadout } from "@/components/ui/mfd";
import { Calendar } from "lucide-react";

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
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
            <Calendar className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <EventTypeBadge type={event.type} />
              <h1 className="text-2xl font-bold text-text-primary">{event.title}</h1>
            </div>
            <p className="text-sm text-text-muted">
              <a href="/events" className="hover:text-text-secondary">EVENTS</a>
              <span className="mx-1 opacity-40">/</span>
              DETAIL
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`/events/${event.id}/edit`}
              className="rounded border border-border px-3 py-1.5 text-sm text-text-secondary hover:border-primary hover:text-text-primary transition-colors"
            >
              Edit
            </a>
            <DeleteEventButton eventId={event.id} />
          </div>
        )}
      </div>

      {/* Mission clock / stats strip */}
      <div className="flex flex-wrap items-stretch gap-x-6 gap-y-3 border border-border bg-surface-elevated px-4 py-2.5 mfd-cut-tl-br">
        <MfdReadout
          label="STARTS"
          value={formatDateTime(event.startsAt)}
          tone="amber"
          size="sm"
        />
        {event.endsAt && (
          <MfdReadout
            label="ENDS"
            value={formatDateTime(event.endsAt)}
            tone="amber"
            size="sm"
          />
        )}
        {event.location && (
          <MfdReadout label="LOCATION" value={event.location} tone="primary" size="sm" />
        )}
        <MfdReadout label="GOING" value={event.counts.GOING} tone="primary" size="sm" />
        <MfdReadout label="MAYBE" value={event.counts.MAYBE} tone="muted" size="sm" />
        <div className="ml-auto flex flex-col gap-0.5 justify-center">
          <span className="mfd-label">POSTED BY</span>
          <span className="text-xs text-text-muted">{event.createdByName}</span>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <MfdPanel chassis="neutral" title={<span>[ BRIEFING ]</span>} bodyPadding="md">
          <p className="whitespace-pre-wrap text-sm text-text-primary">{event.description}</p>
        </MfdPanel>
      )}

      {/* RSVP */}
      <MfdPanel chassis="primary" title={<span>[ YOUR RSVP ]</span>} bodyPadding="md">
        <RsvpButtons eventId={event.id} current={myRsvp} />
      </MfdPanel>

      {/* Roster */}
      <div className="grid gap-4 sm:grid-cols-2">
        <MfdPanel
          chassis="neutral"
          title={<span>[ GOING ]</span>}
          titleAside={<span className="mfd-readout text-sm">{event.counts.GOING}</span>}
          bodyPadding="sm"
        >
          {going.length === 0 ? (
            <p className="text-sm text-text-muted">No one yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {going.map((r) => (
                <li key={r.membershipId}>
                  <a href={`/members/${r.username}`} className="text-text-primary hover:underline hover:text-primary">
                    {r.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </MfdPanel>

        <MfdPanel
          chassis="neutral"
          title={<span>[ MAYBE ]</span>}
          titleAside={<span className="mfd-readout text-sm">{event.counts.MAYBE}</span>}
          bodyPadding="sm"
        >
          {maybe.length === 0 ? (
            <p className="text-sm text-text-muted">No one yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {maybe.map((r) => (
                <li key={r.membershipId}>
                  <a href={`/members/${r.username}`} className="text-text-primary hover:underline hover:text-primary">
                    {r.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </MfdPanel>
      </div>
    </div>
  );
}
