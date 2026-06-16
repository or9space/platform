import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { makeTenantContext } from "@/lib/tenant";
import { ProfileForm } from "@/components/settings/profile-form";

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
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-text-muted">Your profile in {ctx.config.branding.name} (@{me?.username})</p>
      </div>
      <ProfileForm
        initial={{
          displayName: me?.displayName ?? "",
          bio: me?.bio ?? "",
          avatarUrl: me?.avatarUrl ?? "",
        }}
      />
    </main>
  );
}
