import { notFound } from "next/navigation";
import {
  ShieldAlert, Users, Shield, FileText, ChevronRight,
  Newspaper, MessagesSquare, CalendarDays, Swords,
  Handshake, Image, Search, Award, TrendingUp, Crown,
  Settings, Globe, Zap, UserPlus, DollarSign,
} from "lucide-react";

import { MfdPanel, MfdReadout } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getAdminStats } from "@/lib/queries/admin-stats";

export const metadata = { title: "Admin — Command Dashboard" };

const quickLinks = [
  { href: "/admin/config", label: "Config", desc: "Branding & features", icon: Settings },
  { href: "/admin/members", label: "Members", desc: "Ranks & access", icon: Users },
  { href: "/admin/directory", label: "Directory", desc: "Public listing", icon: Globe },
  { href: "/admin/integrations", label: "Integrations", desc: "Discord & Calendar", icon: Zap },
  { href: "/recruitment", label: "Recruitment", desc: "Review applications", icon: UserPlus },
  { href: "/news/new", label: "Post News", desc: "New announcement", icon: Newspaper },
];

export default async function TenantAdminHome() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const { tenant } = ctx;

  const m = await getViewerMembership(tenant.id, await getSessionAccountId());
  if (!m || !hasTier(m.tier, "COMMAND")) return notFound();

  const tenantCtx = makeTenantContext(tenant.id);
  const stats = await getAdminStats(tenantCtx);

  const statGroups = [
    {
      label: "MEMBERSHIP",
      chassis: "primary" as const,
      items: [
        { label: "Total Members", value: stats.totalMembers, icon: Users },
        { label: "Enlisted", value: stats.enlisted, icon: Shield },
        { label: "NCO", value: stats.nco, icon: Shield },
        { label: "Officer / Command", value: stats.officer + stats.command, icon: Crown },
      ],
    },
    {
      label: "OPERATIONS",
      chassis: "amber" as const,
      items: [
        { label: "Open Operations", value: stats.openOperations, icon: Swords },
        { label: "Upcoming Events", value: stats.upcomingEvents, icon: CalendarDays },
        { label: "Open Contracts", value: stats.openContracts, icon: Handshake },
        { label: "Active LFG Posts", value: stats.activeLfg, icon: Search },
      ],
    },
    {
      label: "CONTENT",
      chassis: "neutral" as const,
      items: [
        { label: "Forum Threads", value: stats.forumThreads, icon: MessagesSquare },
        { label: "Forum Posts", value: stats.forumPosts, icon: TrendingUp },
        { label: "News Posts", value: stats.newsPosts, icon: Newspaper },
        { label: "Gallery Items", value: stats.galleryItems, icon: Image },
      ],
    },
    {
      label: "ACTIVITY",
      chassis: "neutral" as const,
      items: [
        { label: "Loot Members", value: stats.lootMembers, icon: Users },
        { label: "Total Awards", value: stats.totalAwards, icon: Award },
        { label: "Treasury Balance", value: stats.treasuryBalance.toLocaleString(), icon: DollarSign },
        { label: "Pending Applications", value: stats.pendingApplications, icon: FileText },
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-page-enter">
      <PageHeader
        icon={ShieldAlert}
        title="Admin"
        subtitle="Command dashboard — officer access only"
        readout={<span className="mfd-readout text-base font-semibold tabular-nums">{stats.totalMembers} members</span>}
      />

      {/* Pending applications alert */}
      {stats.pendingApplications > 0 && (
        <a
          href="/recruitment"
          className="flex items-center justify-between rounded border border-amber/40 bg-amber/10 px-4 py-3 text-sm transition-colors hover:bg-amber/20"
        >
          <span className="font-medium text-amber">
            {stats.pendingApplications} pending application{stats.pendingApplications !== 1 ? "s" : ""} awaiting review
          </span>
          <ChevronRight className="h-4 w-4 text-amber" />
        </a>
      )}

      {/* KPI stat groups */}
      {statGroups.map((group) => (
        <MfdPanel
          key={group.label}
          chassis={group.chassis}
          title={<span>[ {group.label} ]</span>}
          bodyPadding="md"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                  <MfdReadout
                    label={item.label}
                    value={item.value}
                    tone={group.chassis === "primary" ? "primary" : group.chassis === "amber" ? "amber" : "muted"}
                    size="lg"
                  />
                </div>
              );
            })}
          </div>
        </MfdPanel>
      ))}

      {/* Quick actions */}
      <MfdPanel chassis="neutral" title={<span>[ QUICK ACTIONS ]</span>} bodyPadding="sm">
        <div className="flex flex-wrap gap-2 py-1">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded border border-border/60 bg-surface-elevated px-3 py-2 text-sm text-text-secondary transition-colors hover:border-border hover:bg-surface-hover hover:text-text-primary"
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{link.label}</span>
                <span className="hidden text-xs text-text-muted sm:inline">{link.desc}</span>
                <ChevronRight className="h-3 w-3 opacity-40" />
              </a>
            );
          })}
        </div>
      </MfdPanel>
    </div>
  );
}
