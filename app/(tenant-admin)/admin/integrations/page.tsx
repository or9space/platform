import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { notFound } from "next/navigation";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { IntegrationsForm } from "./integrations-form";
import { Plug } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";

export default async function IntegrationsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const { tenant, config } = ctx;

  // Guard BEFORE reading any integrations config detail so the RSC payload
  // never streams integration data (including the botToken boolean) to
  // non-COMMAND members. Mirror the pattern from admin/config/page.tsx.
  const accountId = await getSessionAccountId();
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m || !hasTier(m.tier, "COMMAND")) return notFound();

  const integrations = config.integrations;
  const discordGuildId = integrations?.discord?.guildId ?? "";
  const calendarId = integrations?.googleCalendar?.calendarId ?? "";
  // SECURITY: never pass the token value to the client — boolean only.
  const botTokenSet = Boolean(integrations?.discord?.botToken);

  // plan is read from the tenant row returned by getCurrentTenant() inside
  // getFullTenantContext() — prismaGlobal.tenant.findUnique({ where: { slug } })
  // — so it is always server-sourced and cannot be spoofed by the client.
  const isPaid = tenant.plan === "PAID";

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Plug className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">INTEGRATIONS</h1>
          <p className="text-sm text-text-muted">Discord and Google Calendar connections</p>
        </div>
      </div>
      <MfdPanel chassis="neutral" title={<span>[ EXTERNAL SERVICES ]</span>} bodyPadding="md">
        <IntegrationsForm
          tenantId={tenant.id}
          initial={{ discordGuildId, calendarId, botTokenSet }}
          canSetToken={isPaid}
        />
      </MfdPanel>
    </div>
  );
}
