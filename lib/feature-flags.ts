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
  | "events"
  | "news"
  | "operations"
  | "resources"
  | "lfg"
  | "alliances"
  | "awards"
  | "contracts"
  | "gallery"
  | "handbook"
  | "loot"
  | "inventory"
  | "treasury"
  | "fleet"
  | "tournaments"
  | "calendar.googleIntegration"
  | "discord.bot"
  | "ads";

// Free tier = a usable community starter (forums, events, news, handbook +
// members/directory which need no flag). Everything operational/economy is
// PAID-only: off by default for free tenants AND blocked from being enabled
// (isFlagAllowedForPlan) until they upgrade. paidOnly drives both the gate and
// the locked toggle in the admin UI.
export const FEATURE_FLAGS: ReadonlyArray<FeatureFlagDef> = [
  // --- Free tier (community starter) ---
  { key: "forums",                      label: "Forums",            defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "events",                      label: "Events",            defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "news",                        label: "News",              defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "handbook",                    label: "Handbook",          defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  // --- Paid tier (full ops HQ) ---
  { key: "operations",                  label: "Operations",        defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  { key: "loot",                        label: "Loot Points",       defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  { key: "treasury",                    label: "Treasury",          defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  { key: "inventory",                   label: "Inventory",         defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  { key: "fleet",                       label: "Fleet",             defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  { key: "tournaments",                 label: "Tournaments",       defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  { key: "resources",                   label: "Resources",         defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  { key: "lfg",                         label: "LFG",               defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  { key: "alliances",                   label: "Alliances",         defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  { key: "awards",                      label: "Awards",            defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  { key: "contracts",                   label: "Contracts",         defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  { key: "gallery",                     label: "Gallery",           defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  // --- Integrations / platform ---
  { key: "calendar.googleIntegration",  label: "Google Calendar",   defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "discord.bot",                 label: "Discord Bot",       defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true  },
  { key: "ads",                         label: "Ads",               defaultFree: true,  defaultPaid: false, tenantEditable: false, paidOnly: false },
];

const FLAG_KEY_SET: ReadonlySet<string> = new Set(FEATURE_FLAGS.map((f) => f.key));

export function isValidFlagKey(key: string): key is FeatureFlagKey {
  return FLAG_KEY_SET.has(key);
}
