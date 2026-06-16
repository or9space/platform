import { FEATURE_FLAGS } from "../feature-flags";

export interface MarketingFeature {
  key: string;
  name: string;
  blurb: string;
}

export const MARKETING_FEATURES: MarketingFeature[] = [
  {
    key: "forums",
    name: "Forums",
    blurb: "Per-org discussion boards with threads, replies, pinning and moderation.",
  },
  {
    key: "members",
    name: "Members & Ranks",
    blurb: "A roster with rank tiers, profiles, and command-gated promotions.",
  },
  {
    key: "treasury",
    name: "Treasury",
    blurb: "Track org income and expenses with a running balance and category breakdown.",
  },
  {
    key: "loot",
    name: "Loot Points",
    blurb: "Reward attendance, spend points, and transfer them between members.",
  },
  {
    key: "handbook",
    name: "Handbook",
    blurb: "Versioned org handbooks your members read and acknowledge.",
  },
  {
    key: "inventory",
    name: "Inventory",
    blurb: "A catalog of org assets with quantities, custodians, and state.",
  },
  {
    key: "fleet",
    name: "Fleet",
    blurb: "A member-owned ship roster — public showcase or private holdings.",
  },
  {
    key: "tournaments",
    name: "Tournaments",
    blurb: "Run competitions with sign-ups, brackets, and final placements.",
  },
  {
    key: "integrations",
    name: "Integrations",
    blurb: "Connect Discord and Google Calendar (bot token on paid plans).",
  },
];

export interface PlanRow {
  key: string;
  label: string;
  free: boolean;
  paid: boolean;
  selfHosted: boolean;
  paidOnly: boolean;
}

export function buildPlanMatrix(): PlanRow[] {
  return FEATURE_FLAGS.map((f) => ({
    key: f.key,
    label: f.label,
    free: f.defaultFree,
    paid: f.defaultPaid,
    // Self-hosted (open-core) gets the full feature set — same defaults as paid.
    selfHosted: f.defaultPaid,
    paidOnly: f.paidOnly,
  }));
}
