import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { EventForm } from "@/components/events/event-form";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
import { Calendar } from "lucide-react";

export default async function NewEventPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader icon={Calendar} title="New Event" subtitle="EVENTS / CREATE" />

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
