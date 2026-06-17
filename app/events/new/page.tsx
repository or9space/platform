import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { EventForm } from "@/components/events/event-form";
import { MfdPanel } from "@/components/ui/mfd";
import { Calendar } from "lucide-react";

export default async function NewEventPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Calendar className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">New Event</h1>
          <p className="text-sm text-text-muted">
            <a href="/events" className="hover:text-text-secondary">EVENTS</a>
            <span className="mx-1 opacity-40">/</span>
            CREATE
          </p>
        </div>
      </div>

      <MfdPanel
        chassis="primary"
        title={<span>[ EVENT DETAILS ]</span>}
        bodyPadding="md"
      >
        <EventForm />
      </MfdPanel>
    </div>
  );
}
