import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { notFound } from "next/navigation";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { IntegrationsForm } from "./integrations-form";

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
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Integrations</h2>
      <IntegrationsForm
        tenantId={tenant.id}
        initial={{ discordGuildId, calendarId, botTokenSet }}
        canSetToken={isPaid}
      />
    </div>
  );
}
