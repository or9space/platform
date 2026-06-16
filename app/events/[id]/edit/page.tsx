import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getEvent } from "@/lib/queries/events";
import { toLocalInputValue } from "@/lib/format";
import { EventForm } from "@/components/events/event-form";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  const { id } = await params;
  const event = await getEvent(makeTenantContext(ctx.tenant.id), id);
  if (!event) notFound();

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit event</h1>
        <a href={`/events/${id}`} className="text-sm text-text-secondary underline hover:text-text-primary">← Cancel</a>
      </div>
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
    </main>
  );
}
