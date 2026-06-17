import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { makeTenantContext } from "@/lib/tenant";
import { ProfileForm } from "@/components/settings/profile-form";
import { RsiForm } from "@/components/settings/rsi-form";
import { SocialsForm } from "@/components/settings/socials-form";
import { TimezoneForm } from "@/components/settings/timezone-form";
import { MfdPanel } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
import { Settings, CalendarDays } from "lucide-react";

interface MeSocials {
  discord?: string | null;
  twitch?: string | null;
  youtube?: string | null;
  website?: string | null;
}

export default async function SettingsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();

  const me = await db(makeTenantContext(ctx.tenant.id)).membership.findFirst({
    where: { id: viewer.id },
    select: {
      displayName: true,
      bio: true,
      avatarUrl: true,
      username: true,
      rsiHandle: true,
      timezone: true,
      socials: true,
    },
  });

  const socials = (me?.socials as MeSocials | null) ?? {};

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

      {/* RSI Account panel */}
      <MfdPanel chassis="neutral" title={<span>[ RSI ACCOUNT ]</span>} bodyPadding="md">
        <RsiForm initial={{ rsiHandle: me?.rsiHandle ?? "" }} />
      </MfdPanel>

      {/* Social Links panel */}
      <MfdPanel chassis="neutral" title={<span>[ SOCIAL LINKS ]</span>} bodyPadding="md">
        <SocialsForm
          initial={{
            discord: socials.discord ?? "",
            twitch: socials.twitch ?? "",
            youtube: socials.youtube ?? "",
            website: socials.website ?? "",
          }}
        />
      </MfdPanel>

      {/* Timezone panel */}
      <MfdPanel chassis="neutral" title={<span>[ TIMEZONE ]</span>} bodyPadding="md">
        <TimezoneForm initial={{ timezone: me?.timezone ?? "UTC" }} />
      </MfdPanel>

      {/* Availability link panel */}
      <MfdPanel chassis="neutral" title={<span>[ AVAILABILITY ]</span>} bodyPadding="md">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <p className="text-sm text-text-secondary">
            Set your weekly availability schedule so others know when you&apos;re online.
          </p>
          <a
            href="/settings/availability"
            className="ml-auto shrink-0 border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            EDIT SCHEDULE
          </a>
        </div>
      </MfdPanel>
    </div>
  );
}
