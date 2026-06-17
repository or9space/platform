import { ShieldAlert } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";

export default function TenantAdminHome() {
  const links = [
    { href: "/admin/config", label: "[ CONFIG ]", desc: "Branding, labels, features, custom fields" },
    { href: "/admin/directory", label: "[ DIRECTORY ]", desc: "Public listing on or9.space" },
    { href: "/admin/integrations", label: "[ INTEGRATIONS ]", desc: "Discord, Google Calendar" },
    { href: "/admin/members", label: "[ MEMBERS ]", desc: "Rank management and access" },
    { href: "/admin/billing", label: "[ BILLING ]", desc: "Plan and subscription" },
  ];
  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">COMMAND CENTER</h1>
          <p className="text-sm text-text-muted">Tenant administration — officer access only</p>
        </div>
      </div>
      <MfdPanel chassis="neutral" title={<span>[ ADMIN MODULES ]</span>} bodyPadding="sm">
        <ul className="divide-y divide-border/40">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="flex items-center justify-between px-2 py-3 hover:bg-surface-elevated transition-colors">
                <span className="mfd-label text-primary">{l.label}</span>
                <span className="text-xs text-text-muted">{l.desc}</span>
              </a>
            </li>
          ))}
        </ul>
      </MfdPanel>
    </div>
  );
}
