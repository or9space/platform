import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import type { RankTier } from "@/lib/permissions";
import type { TenantConfig } from "@/lib/config/schema";

type RankLabelKey = "rankEnlisted" | "rankNco" | "rankOfficer" | "rankCommand";

export function rankLabelKey(tier: RankTier): RankLabelKey {
  switch (tier) {
    case "ENLISTED": return "rankEnlisted";
    case "NCO": return "rankNco";
    case "OFFICER": return "rankOfficer";
    case "COMMAND": return "rankCommand";
  }
}

const FALLBACK: Record<RankTier, string> = {
  ENLISTED: "Enlisted", NCO: "NCO", OFFICER: "Officer", COMMAND: "Command",
};

/** Server component: renders the tenant's label for a rank tier. */
export async function Rank({ tier }: { tier: RankTier }) {
  const ctx = await getFullTenantContext();
  const key = rankLabelKey(tier) as keyof TenantConfig["labels"];
  return <>{ctx?.config.labels[key] ?? FALLBACK[tier]}</>;
}
