import type { FeatureFlagKey } from "./feature-flags";

export interface ContentTypeDef {
  name: ContentTypeName;
  featureFlag: FeatureFlagKey;
  customFieldEligible: boolean;
}

export type ContentTypeName =
  | "forum_thread" | "forum_post"
  | "handbook" | "handbook_section" | "signoff_category" | "signoff_item" | "signoff_signature" | "handbook_ack"
  | "loot_member" | "loot_session" | "loot_attendance" | "loot_transaction"
  | "org_item_catalog" | "org_item_instance" | "org_item_event" | "org_item_loan" | "personal_org_item_entry" | "org_item_request"
  | "treasury_entry" | "treasury_category"
  | "ship" | "hangar_slot"
  | "tournament" | "tournament_bracket" | "tournament_registration";

export const CONTENT_TYPES: ReadonlyArray<ContentTypeDef> = [
  { name: "forum_thread",            featureFlag: "forums",      customFieldEligible: true  },
  { name: "forum_post",              featureFlag: "forums",      customFieldEligible: false },
  { name: "handbook",                featureFlag: "handbook",    customFieldEligible: false },
  { name: "handbook_section",        featureFlag: "handbook",    customFieldEligible: true  },
  { name: "signoff_category",        featureFlag: "handbook",    customFieldEligible: false },
  { name: "signoff_item",            featureFlag: "handbook",    customFieldEligible: true  },
  { name: "signoff_signature",       featureFlag: "handbook",    customFieldEligible: false },
  { name: "handbook_ack",            featureFlag: "handbook",    customFieldEligible: false },
  { name: "loot_member",             featureFlag: "loot",        customFieldEligible: false },
  { name: "loot_session",            featureFlag: "loot",        customFieldEligible: true  },
  { name: "loot_attendance",         featureFlag: "loot",        customFieldEligible: false },
  { name: "loot_transaction",        featureFlag: "loot",        customFieldEligible: false },
  { name: "org_item_catalog",        featureFlag: "inventory",   customFieldEligible: true  },
  { name: "org_item_instance",       featureFlag: "inventory",   customFieldEligible: false },
  { name: "org_item_event",          featureFlag: "inventory",   customFieldEligible: false },
  { name: "org_item_loan",           featureFlag: "inventory",   customFieldEligible: false },
  { name: "personal_org_item_entry", featureFlag: "inventory",   customFieldEligible: true  },
  { name: "org_item_request",        featureFlag: "inventory",   customFieldEligible: false },
  { name: "treasury_entry",          featureFlag: "treasury",    customFieldEligible: true  },
  { name: "treasury_category",       featureFlag: "treasury",    customFieldEligible: false },
  { name: "ship",                    featureFlag: "fleet",       customFieldEligible: true  },
  { name: "hangar_slot",             featureFlag: "fleet",       customFieldEligible: false },
  { name: "tournament",              featureFlag: "tournaments", customFieldEligible: true  },
  { name: "tournament_bracket",      featureFlag: "tournaments", customFieldEligible: false },
  { name: "tournament_registration", featureFlag: "tournaments", customFieldEligible: false },
];

export const CUSTOM_FIELD_ELIGIBLE_TYPES = CONTENT_TYPES.filter(
  (t) => t.customFieldEligible,
).map((t) => t.name);

const ELIGIBLE_SET: ReadonlySet<string> = new Set(CUSTOM_FIELD_ELIGIBLE_TYPES);

export function isCustomFieldEligible(name: string): boolean {
  return ELIGIBLE_SET.has(name);
}
