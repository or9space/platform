import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { notFound } from "next/navigation";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { CUSTOM_FIELD_ELIGIBLE_TYPES } from "@/lib/content-types";
import { BrandingForm } from "./branding-form";
import { LabelsForm } from "./labels-form";
import { FeatureToggles } from "./feature-toggles";
import { CustomFieldsEditor } from "./custom-fields-editor";

export default async function ConfigPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const { tenant, config, features } = ctx;

  // The layout already shows the COMMAND wall, but this page is a separate
  // server component whose config data would otherwise stream into the RSC
  // payload for non-COMMAND members. Guard here so it never runs for them.
  const m = await getViewerMembership(tenant.id, await getSessionAccountId());
  if (!m || !hasTier(m.tier, "COMMAND")) return null;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-xl font-semibold">Branding</h2>
        <BrandingForm tenantId={tenant.id} initial={{ name: config.branding.name, tagline: config.branding.tagline, preset: config.branding.preset }} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Labels</h2>
        <LabelsForm tenantId={tenant.id} initial={config.labels} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Features</h2>
        <FeatureToggles
          tenantId={tenant.id}
          plan={tenant.plan}
          flags={FEATURE_FLAGS.map((f) => ({ key: f.key, label: f.label, enabled: features[f.key], tenantEditable: f.tenantEditable, paidOnly: f.paidOnly }))}
        />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Custom fields</h2>
        <CustomFieldsEditor
          tenantId={tenant.id}
          eligibleTypes={[...CUSTOM_FIELD_ELIGIBLE_TYPES]}
          defs={(config.customFields ?? {}) as Record<string, Array<{ key: string; label: string; kind: string }>>}
        />
      </section>
    </div>
  );
}
