export interface FeatureFlagDef {
  key: FeatureFlagKey;
  label: string;
  defaultFree: boolean;
  defaultPaid: boolean;
  tenantEditable: boolean;
  paidOnly: boolean;
}

export type FeatureFlagKey =
  | "forums"
  | "handbook"
  | "loot"
  | "inventory"
  | "treasury"
  | "fleet"
  | "tournaments"
  | "calendar.googleIntegration"
  | "discord.bot"
  | "ads";

export const FEATURE_FLAGS: ReadonlyArray<FeatureFlagDef> = [
  { key: "forums",                      label: "Forums",            defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "handbook",                    label: "Handbook",          defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "loot",                        label: "Loot Points",       defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "inventory",                   label: "Inventory",         defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "treasury",                    label: "Treasury",          defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "fleet",                       label: "Fleet",             defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "tournaments",                 label: "Tournaments",       defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "calendar.googleIntegration",  label: "Google Calendar",   defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "discord.bot",                 label: "Discord Bot",       defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true },
  { key: "ads",                         label: "Ads",               defaultFree: true,  defaultPaid: false, tenantEditable: false, paidOnly: false },
];

const FLAG_KEY_SET: ReadonlySet<string> = new Set(FEATURE_FLAGS.map((f) => f.key));

export function isValidFlagKey(key: string): key is FeatureFlagKey {
  return FLAG_KEY_SET.has(key);
}
