import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { notFound } from "next/navigation";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { DirectoryForm } from "./directory-form";

export default async function DirectoryPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const { tenant } = ctx;

  const m = await getViewerMembership(tenant.id, await getSessionAccountId());
  if (!m || !hasTier(m.tier, "COMMAND")) return notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Public directory</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Control whether your org appears on the{" "}
          <a href="/orgs" className="underline hover:text-text-primary">
            public or9.space directory
          </a>.
        </p>
      </div>
      <DirectoryForm
        tenantId={tenant.id}
        initial={{
          isListed: tenant.isListed,
          tagline: tenant.tagline ?? "",
        }}
      />
    </div>
  );
}
