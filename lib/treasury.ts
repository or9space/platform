export const TREASURY_CATEGORIES = [
  "MINING", "TRADING", "BOUNTY", "SALVAGE", "DONATION", "PURCHASE", "PAYOUT", "EVENT", "OTHER",
] as const;
export type TreasuryCategory = (typeof TREASURY_CATEGORIES)[number];
export const TREASURY_TYPES = ["INCOME", "EXPENSE"] as const;
export type TreasuryType = (typeof TREASURY_TYPES)[number];

export const CATEGORY_LABELS: Record<TreasuryCategory, string> = {
  MINING: "Mining", TRADING: "Trading", BOUNTY: "Bounty", SALVAGE: "Salvage",
  DONATION: "Donation", PURCHASE: "Purchase", PAYOUT: "Payout", EVENT: "Event", OTHER: "Other",
};
