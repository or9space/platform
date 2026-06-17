import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getEvent } from "@/lib/queries/events";
import { toLocalInputValue } from "@/lib/format";
import { EventForm } from "@/components/events/event-form";
import { MfdPanel } from "@/components/ui/mfd";
import { Calendar } from "lucide-react";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  const { id } = await params;
  const event = await getEvent(makeTenantContext(ctx.tenant.id), id);
  if (!event) notFound();

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Calendar className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Edit Event</h1>
          <p className="text-sm text-text-muted">
            <a href="/events" className="hover:text-text-secondary">EVENTS</a>
            <span className="mx-1 opacity-40">/</span>
            <a href={`/events/${id}`} className="hover:text-text-secondary">{event.title}</a>
            <span className="mx-1 opacity-40">/</span>
            EDIT
          </p>
        </div>
      </div>

      <MfdPanel
        chassis="amber"
        title={<span>[ EDIT EVENT ]</span>}
        titleAside={<span className="mfd-label truncate max-w-48">{event.title}</span>}
        bodyPadding="md"
      >
        <EventForm
          eventId={id}
          initial={{
            title: event.title,
            type: event.type,
            startsAt: toLocalInputValue(event.startsAt),
            endsAt: event.endsAt ? toLocalInputValue(event.endsAt) : "",
            location: event.location ?? "",
            description: event.description ?? "",
          }}
        />
      </MfdPanel>
    </div>
  );
}
