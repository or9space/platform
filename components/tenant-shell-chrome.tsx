"use client";

import { useState, type ReactNode, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home, Activity, MessageSquare, Calendar, Users, Rocket, Swords, ClipboardList,
  MessagesSquare, Newspaper, UserPlus2, FileText, Wallet, Handshake, Medal, Coins,
  Package, BookOpen, BookMarked, Image as ImageIcon, Trophy, Megaphone, Settings,
  DollarSign, ArrowRightLeft, TrendingUp, Globe, Pickaxe, Wrench, LogOut, User, Eye,
  Menu, PanelLeftClose, PanelLeftOpen, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  home: Home, activity: Activity, messages: MessageSquare, calendar: Calendar,
  members: Users, fleet: Rocket, operations: Swords, projects: ClipboardList,
  forums: MessagesSquare, news: Newspaper, lfg: UserPlus2, contracts: FileText,
  treasury: Wallet, alliances: Handshake, awards: Medal, loot: Coins,
  inventory: Package, resources: BookOpen, handbook: BookMarked, gallery: ImageIcon,
  tournaments: Trophy, recruitment: Megaphone, squads: Users, settings: Settings,
  prices: DollarSign, compare: ArrowRightLeft, trade: TrendingUp, starmap: Globe,
  mining: Pickaxe, hangar: Rocket, loadouts: Wrench, logistics: Package,
};

export interface NavEntry { key: string; label: string; href: string; icon: string }
export interface NavSection { title: string; entries: NavEntry[] }

function isActive(pathname: string, href: string): boolean {
  const path = href.split("?")[0];
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(path + "/");
}

export interface TenantPalette { primary?: string; amber?: string; cream?: string; surface?: string }

export function TenantShellChrome({
  brandName, userName, profileHref, sections, logoUrl, palette, children,
}: {
  brandName: string;
  userName: string;
  profileHref: string;
  sections: NavSection[];
  logoUrl?: string | null;
  palette?: TenantPalette;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const words = brandName.trim().split(/\s+/);
  const first = words[0] ?? brandName;
  const rest = words.slice(1).join(" ");

  // Per-tenant accent: override the theme CSS vars on the root so each org
  // can carry its own color while sharing the tactical chassis.
  const accentStyle = {
    ...(palette?.primary ? { "--color-primary": palette.primary } : {}),
    ...(palette?.amber ? { "--color-amber": palette.amber } : {}),
    ...(palette?.cream ? { "--color-fg-cream": palette.cream } : {}),
    ...(palette?.surface ? { "--color-surface": palette.surface } : {}),
  } as CSSProperties;

  return (
    <div className="tenant-root" style={accentStyle}>
      {/* Navbar — MFD title bar */}
      <header className="fixed top-0 z-50 flex h-16 w-full items-center border-b-2 border-primary/40 bg-surface/95 backdrop-blur-sm">
        <nav className="flex w-full items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
              className="rounded-md p-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-12 w-12 object-contain" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-stencil text-lg text-primary">
                  {first[0]?.toUpperCase()}
                </span>
              )}
              <span className="fg-wordmark">
                <span className="fg-wordmark__free">{first}</span>
                {rest && <span className="fg-wordmark__guards">&nbsp;{rest}</span>}
              </span>
            </Link>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tier-command-soft text-xs font-bold text-tier-command">
                {userName[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="hidden md:inline">{userName}</span>
            </button>
            {menuOpen && (
              <ul role="menu" className="absolute right-0 top-full mt-1 w-48 rounded-md border border-border bg-surface-elevated py-1 shadow-lg">
                <li>
                  <a href={profileHref} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary">
                    <Eye className="h-4 w-4" /> View Profile
                  </a>
                </li>
                <li>
                  <a href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary">
                    <User className="h-4 w-4" /> Settings
                  </a>
                </li>
                <li>
                  <button onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-fg-red-light hover:bg-surface-hover">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </li>
              </ul>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile scrim */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-fg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] flex-col border-r border-border bg-surface transition-all duration-200",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "block" : "hidden lg:flex",
        ].join(" ")}
      >
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {sections.map((section, idx) => (
            <div key={section.title} className={idx > 0 ? "mt-4" : ""}>
              {!collapsed && (
                <div className="mb-2 flex w-full items-center justify-between gap-2 px-2 py-1">
                  <span className="mfd-label flex items-center gap-1">
                    <span className="text-primary">[</span>{section.title}<span className="text-primary">]</span>
                  </span>
                  <span className="mfd-readout text-[10px]">{section.entries.length}</span>
                </div>
              )}
              {collapsed && idx > 0 && <div className="mx-2 mb-2 border-t border-border" />}
              <ul className="space-y-0.5">
                {section.entries.map((e) => {
                  const Icon = ICONS[e.icon] ?? Home;
                  const active = isActive(pathname, e.href);
                  return (
                    <li key={e.key}>
                      <a
                        href={e.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? e.label : undefined}
                        className={[
                          "relative flex items-center rounded-sm text-sm transition-colors",
                          collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                          active
                            ? "bg-primary/15 text-primary font-medium mfd-nav-active"
                            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && e.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border px-3 py-2">
          <div className="flex items-center justify-between">
            {!collapsed && <p className="text-xs text-text-muted">{brandName}</p>}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className={["rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors", collapsed && "mx-auto"].filter(Boolean).join(" ")}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className={["pt-16 transition-all duration-200", collapsed ? "lg:pl-16" : "lg:pl-60"].join(" ")}>
        <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      </main>
    </div>
  );
}
