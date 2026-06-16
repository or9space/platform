import type { ReactNode } from "react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { TenantShellChrome, type NavSection, type NavEntry } from "./tenant-shell-chrome";

/**
 * Tenant member-app chrome — the Freedom Guards "MFD" shell (fixed navbar +
 * sectioned sidebar) applied to every tenant page. Builds the nav from the
 * tenant's enabled features + viewer tier (server side), then hands an
 * interactive client chrome the resolved sections. Active state is
 * pathname-driven in the client, so layouts just wrap children — no `active` prop.
 */
export async function TenantShell({ children }: { children: ReactNode }) {
  const ctx = await getFullTenantContext();
  if (!ctx) return <>{children}</>;
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  const tier = viewer?.tier ?? null;
  const f = ctx.features;

  const org: NavEntry[] = [{ key: "dashboard", label: "Dashboard", href: "/", icon: "home" }];
  const add = (cond: boolean, e: NavEntry) => { if (cond) org.push(e); };

  add(isFeatureEnabled(f, "activity"), { key: "activity", label: "Activity", href: "/activity", icon: "activity" });
  add(isFeatureEnabled(f, "messages"), { key: "messages", label: "Messages", href: "/messages", icon: "messages" });
  add(isFeatureEnabled(f, "events"), { key: "events", label: "Calendar", href: "/events", icon: "calendar" });
  org.push({ key: "members", label: "Roster", href: "/members", icon: "members" });
  add(isFeatureEnabled(f, "squads"), { key: "squads", label: "Squads", href: "/squads", icon: "squads" });
  add(isFeatureEnabled(f, "fleet"), { key: "fleet", label: "Fleet", href: "/fleet", icon: "fleet" });
  add(isFeatureEnabled(f, "operations"), { key: "operations", label: "Operations", href: "/operations", icon: "operations" });
  add(isFeatureEnabled(f, "projects"), { key: "projects", label: "Projects", href: "/projects", icon: "projects" });
  add(isFeatureEnabled(f, "forums"), { key: "forums", label: "Forums", href: "/forums", icon: "forums" });
  add(isFeatureEnabled(f, "news"), { key: "news", label: "News", href: "/news", icon: "news" });
  add(isFeatureEnabled(f, "lfg"), { key: "lfg", label: "LFG", href: "/lfg", icon: "lfg" });
  add(isFeatureEnabled(f, "contracts"), { key: "contracts", label: "Contracts", href: "/contracts", icon: "contracts" });
  add(isFeatureEnabled(f, "treasury") && hasTier(tier, "OFFICER"), { key: "treasury", label: "Treasury", href: "/treasury", icon: "treasury" });
  add(isFeatureEnabled(f, "alliances"), { key: "alliances", label: "Alliances", href: "/alliances", icon: "alliances" });
  add(isFeatureEnabled(f, "awards"), { key: "awards", label: "Awards", href: "/awards", icon: "awards" });
  add(isFeatureEnabled(f, "loot"), { key: "loot", label: "Loot Points", href: "/loot", icon: "loot" });
  add(isFeatureEnabled(f, "inventory"), { key: "inventory", label: "Inventory", href: "/inventory", icon: "inventory" });
  add(isFeatureEnabled(f, "tournaments"), { key: "tournaments", label: "Tournaments", href: "/tournaments", icon: "tournaments" });
  add(isFeatureEnabled(f, "gallery"), { key: "gallery", label: "Gallery", href: "/gallery", icon: "gallery" });
  add(isFeatureEnabled(f, "resources"), { key: "resources", label: "Resources", href: "/resources", icon: "resources" });
  add(isFeatureEnabled(f, "handbook"), { key: "handbook", label: "Handbook", href: "/handbook", icon: "handbook" });
  add(isFeatureEnabled(f, "recruitment") && hasTier(tier, "OFFICER"), { key: "recruitment", label: "Recruitment", href: "/recruitment", icon: "recruitment" });

  const sections: NavSection[] = [{ title: "Org", entries: org }];

  if (isFeatureEnabled(f, "scTools")) {
    sections.push({
      title: "Star Citizen",
      entries: [
        { key: "hangar", label: "Hangar", href: "/sc-tools/hangar", icon: "hangar" },
        { key: "prices", label: "Prices", href: "/sc-tools/prices", icon: "prices" },
        { key: "compare", label: "Compare", href: "/sc-tools/compare", icon: "compare" },
        { key: "trade", label: "Trade Routes", href: "/sc-tools/trade", icon: "trade" },
        { key: "loadouts", label: "Ship Prices", href: "/sc-tools/loadouts", icon: "loadouts" },
        { key: "logistics", label: "Logistics", href: "/sc-tools/logistics", icon: "logistics" },
        { key: "industry", label: "Industry", href: "/sc-tools/industry", icon: "mining" },
        { key: "starmap", label: "Star Map", href: "/sc-tools/starmap", icon: "starmap" },
      ],
    });
  }

  sections.push({ title: "Account", entries: [{ key: "settings", label: "Settings", href: "/settings", icon: "settings" }] });

  const brandName = ctx.config.branding.name;
  const userName = viewer?.displayName ?? viewer?.username ?? "Member";
  const profileHref = viewer?.username ? `/members/${viewer.username}` : "/members";

  return (
    <TenantShellChrome
      brandName={brandName}
      userName={userName}
      profileHref={profileHref}
      sections={sections}
      logoUrl={ctx.config.branding.logoUrl}
      palette={ctx.config.branding.palette}
    >
      {children}
    </TenantShellChrome>
  );
}
