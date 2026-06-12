export type RankTier = "ENLISTED" | "NCO" | "OFFICER" | "COMMAND";

const TIER_ORDER: Record<RankTier, number> = {
  ENLISTED: 0,
  NCO: 1,
  OFFICER: 2,
  COMMAND: 3,
};

export function tierRank(tier: RankTier): number {
  return TIER_ORDER[tier];
}

export function hasTier(actor: RankTier | null, required: RankTier): boolean {
  if (actor === null) return false;
  return tierRank(actor) >= tierRank(required);
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class FeatureDisabledError extends Error {
  constructor(feature: string) {
    super(`Feature '${feature}' is disabled for this tenant`);
    this.name = "FeatureDisabledError";
  }
}
