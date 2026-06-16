import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { makeTenantContext } from "@/lib/tenant";
import { listApplications } from "@/lib/queries/recruitment";
import { ReviewList } from "@/components/recruitment/recruitment-client";

export default async function RecruitmentPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();

  const apps = await listApplications(makeTenantContext(ctx.tenant.id));
  const pending = apps.filter((a) => a.status === "PENDING").length;
  const applyUrl = `/apply`;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Recruitment</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {pending} pending · public apply form at{" "}
          <a href={applyUrl} className="underline hover:text-text-primary">/apply</a>
        </p>
      </div>
      <ReviewList apps={apps} />
    </main>
  );
}
