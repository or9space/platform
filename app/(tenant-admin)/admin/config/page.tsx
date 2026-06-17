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
import { Settings } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";

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
    <div className="space-y-6 animate-page-enter">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Settings className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">CONFIGURATION</h1>
          <p className="text-sm text-text-muted">Org branding, labels, features, and custom fields</p>
        </div>
      </div>

      <MfdPanel chassis="neutral" title={<span>[ BRANDING ]</span>} bodyPadding="md">
        <BrandingForm tenantId={tenant.id} initial={{ name: config.branding.name, tagline: config.branding.tagline, preset: config.branding.preset }} />
      </MfdPanel>

      <MfdPanel chassis="neutral" title={<span>[ LABELS ]</span>} bodyPadding="md">
        <LabelsForm tenantId={tenant.id} initial={config.labels} />
      </MfdPanel>

      <MfdPanel chassis="neutral" title={<span>[ FEATURES ]</span>} bodyPadding="md">
        <FeatureToggles
          tenantId={tenant.id}
          plan={tenant.plan}
          flags={FEATURE_FLAGS.map((f) => ({ key: f.key, label: f.label, enabled: features[f.key], tenantEditable: f.tenantEditable, paidOnly: f.paidOnly }))}
        />
      </MfdPanel>

      <MfdPanel chassis="neutral" title={<span>[ CUSTOM FIELDS ]</span>} bodyPadding="md">
        <CustomFieldsEditor
          tenantId={tenant.id}
          eligibleTypes={[...CUSTOM_FIELD_ELIGIBLE_TYPES]}
          defs={(config.customFields ?? {}) as Record<string, Array<{ key: string; label: string; kind: string }>>}
        />
      </MfdPanel>
    </div>
  );
}
