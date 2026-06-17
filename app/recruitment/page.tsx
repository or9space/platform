import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { makeTenantContext } from "@/lib/tenant";
import { listApplications } from "@/lib/queries/recruitment";
import { ReviewList } from "@/components/recruitment/recruitment-client";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
import { Megaphone } from "lucide-react";

export default async function RecruitmentPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();

  const apps = await listApplications(makeTenantContext(ctx.tenant.id));
  const pending = apps.filter((a) => a.status === "PENDING").length;

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader
        icon={Megaphone}
        title="Recruitment"
        subtitle="Manage applications and review candidates"
        readout={<>{pending} pending</>}
      />

      {/* Stats row */}
      <MfdPanel chassis="amber" title={<span>[ STATUS ]</span>} bodyPadding="md">
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-0.5">
            <span className="mfd-label">PENDING</span>
            <span className="font-mono font-semibold tabular-nums tracking-wide text-amber text-base">{pending}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="mfd-label">TOTAL</span>
            <span className="font-mono font-semibold tabular-nums tracking-wide text-text-secondary text-base">{apps.length}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="mfd-label">APPROVED</span>
            <span className="font-mono font-semibold tabular-nums tracking-wide text-primary text-base">{apps.filter((a) => a.status === "APPROVED").length}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="mfd-label">REJECTED</span>
            <span className="font-mono font-semibold tabular-nums tracking-wide text-text-muted text-base">{apps.filter((a) => a.status === "REJECTED").length}</span>
          </div>
        </div>
      </MfdPanel>

      {/* Applications panel */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ APPLICATIONS ]</span>}
        titleAside={<span className="mfd-readout text-xs">{apps.length}</span>}
        bodyPadding={apps.length === 0 ? "md" : "md"}
      >
        <ReviewList apps={apps} />
      </MfdPanel>
    </div>
  );
}
