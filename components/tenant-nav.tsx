import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { AdSlot } from "@/components/ads/ad-slot";

/**
 * Shared tenant chrome: a flag/tier-aware nav over the tenant's enabled
 * features + a header ad slot. Each section layout renders <TenantNav active="..."/>
 * after its own gate. Links only appear for features the tenant has enabled and
 * the viewer can access (treasury is OFFICER+ only).
 *
 * Treasury nav link: only shown to OFFICER+ (mirrors the treasury layout gate).
 * Members link: always shown (no feature flag required).
 * AdSlot self-gates on the `ads` flag + slot config — renders nothing for paid
 * tenants or if "below-header" is not in the tenant's configured slots.
 */
export async function TenantNav({ active }: { active?: string }) {
  const ctx = await getFullTenantContext();
  if (!ctx) return null;
  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(ctx.tenant.id, accountId);
  const tier = viewer?.tier ?? null;

  const items: { href: string; label: string; key: string }[] = [];

  if (isFeatureEnabled(ctx.features, "activity"))
    items.push({ href: "/activity", label: "Activity", key: "activity" });

  if (isFeatureEnabled(ctx.features, "forums"))
    items.push({ href: "/forums", label: "Forums", key: "forums" });

  if (isFeatureEnabled(ctx.features, "events"))
    items.push({ href: "/events", label: "Events", key: "events" });

  if (isFeatureEnabled(ctx.features, "news"))
    items.push({ href: "/news", label: "News", key: "news" });

  if (isFeatureEnabled(ctx.features, "operations"))
    items.push({ href: "/operations", label: "Operations", key: "operations" });

  items.push({ href: "/members", label: "Members", key: "members" });

  if (isFeatureEnabled(ctx.features, "squads"))
    items.push({ href: "/squads", label: "Squads", key: "squads" });

  if (isFeatureEnabled(ctx.features, "projects"))
    items.push({ href: "/projects", label: "Projects", key: "projects" });

  if (isFeatureEnabled(ctx.features, "handbook"))
    items.push({ href: "/handbook", label: "Handbook", key: "handbook" });

  if (isFeatureEnabled(ctx.features, "loot"))
    items.push({ href: "/loot", label: "Loot", key: "loot" });

  if (isFeatureEnabled(ctx.features, "inventory"))
    items.push({ href: "/inventory", label: "Inventory", key: "inventory" });

  if (isFeatureEnabled(ctx.features, "fleet"))
    items.push({ href: "/fleet", label: "Fleet", key: "fleet" });

  if (isFeatureEnabled(ctx.features, "tournaments"))
    items.push({ href: "/tournaments", label: "Tournaments", key: "tournaments" });

  if (isFeatureEnabled(ctx.features, "lfg"))
    items.push({ href: "/lfg", label: "LFG", key: "lfg" });

  if (isFeatureEnabled(ctx.features, "alliances"))
    items.push({ href: "/alliances", label: "Alliances", key: "alliances" });

  if (isFeatureEnabled(ctx.features, "contracts"))
    items.push({ href: "/contracts", label: "Contracts", key: "contracts" });

  if (isFeatureEnabled(ctx.features, "awards"))
    items.push({ href: "/awards", label: "Awards", key: "awards" });

  if (isFeatureEnabled(ctx.features, "gallery"))
    items.push({ href: "/gallery", label: "Gallery", key: "gallery" });

  if (isFeatureEnabled(ctx.features, "resources"))
    items.push({ href: "/resources", label: "Resources", key: "resources" });

  // Treasury is OFFICER+ (leadership) — only show the link to OFFICER+.
  if (isFeatureEnabled(ctx.features, "treasury") && hasTier(tier, "OFFICER"))
    items.push({ href: "/treasury", label: "Treasury", key: "treasury" });

  // Personal settings — always available to a member.
  items.push({ href: "/settings", label: "Settings", key: "settings" });

  return (
    <header className="border-b border-neutral-800">
      <nav className="flex flex-wrap gap-4 p-4 text-sm">
        {items.map((it) => (
          <a
            key={it.key}
            href={it.href}
            className={
              it.key === active
                ? "font-bold text-neutral-100"
                : "text-neutral-400 hover:text-neutral-100"
            }
          >
            {it.label}
          </a>
        ))}
      </nav>
      <div className="px-4 pb-3">
        <AdSlot slot="below-header" />
      </div>
    </header>
  );
}
