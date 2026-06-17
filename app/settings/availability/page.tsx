import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { makeTenantContext } from "@/lib/tenant";
import { SettingsAvailabilityGrid } from "@/components/settings/availability-grid";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarDays } from "lucide-react";
import type { AvailabilityGrid } from "@/lib/actions/profile-core";

export default async function AvailabilitySettingsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();

  const me = await db(makeTenantContext(ctx.tenant.id)).membership.findFirst({
    where: { id: viewer.id },
    select: { availability: true, username: true },
  });

  const availability = (me?.availability ?? null) as AvailabilityGrid | null;

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader
        icon={CalendarDays}
        title="Availability"
        subtitle="Set your weekly schedule"
        readout={me?.username ? <>@{me.username}</> : undefined}
      />

      <MfdPanel chassis="neutral" title={<span>[ WEEKLY SCHEDULE ]</span>} bodyPadding="md">
        <SettingsAvailabilityGrid initialAvailability={availability} />
      </MfdPanel>
    </div>
  );
}
