import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { makeTenantContext } from "@/lib/tenant";
import { ProfileForm } from "@/components/settings/profile-form";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();

  const me = await db(makeTenantContext(ctx.tenant.id)).membership.findFirst({
    where: { id: viewer.id },
    select: { displayName: true, bio: true, avatarUrl: true, username: true },
  });

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <PageHeader
        icon={Settings}
        title="Settings"
        subtitle={`Your profile in ${ctx.config.branding.name}`}
        readout={me?.username ? <>@{me.username}</> : undefined}
      />

      {/* Profile panel */}
      <MfdPanel chassis="neutral" title={<span>[ PROFILE ]</span>} bodyPadding="md">
        <ProfileForm
          initial={{
            displayName: me?.displayName ?? "",
            bio: me?.bio ?? "",
            avatarUrl: me?.avatarUrl ?? "",
          }}
        />
      </MfdPanel>
    </div>
  );
}
