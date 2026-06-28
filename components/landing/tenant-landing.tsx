import Link from "next/link";
import { Zap, ClipboardCheck, CheckCircle2, ChevronRight, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicOrgStats } from "@/lib/queries/public-org-stats";

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatCountdown(target: Date): string {
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return "now";
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `in ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `in ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `in ${diffDays}d`;
}

const STATUS_ICON = {
  ACTIVE: Zap,
  DEBRIEFING: ClipboardCheck,
  COMPLETED: CheckCircle2,
} as const;

const STATUS_COLOR = {
  ACTIVE: "text-primary",
  DEBRIEFING: "text-warning",
  COMPLETED: "text-success",
} as const;

function formatOpDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function CrewAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar) {
    return <img src={avatar} alt={name} className="h-6 w-6 rounded-full object-cover ring-1 ring-surface" />;
  }
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-tier-command-soft text-[10px] font-bold text-tier-command ring-1 ring-surface">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────
interface TenantLandingProps {
  brandName: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  stats: PublicOrgStats;
}

export function TenantLanding({ brandName, tagline, description, logoUrl, stats }: TenantLandingProps) {
  const { memberCount, nextOp, lastOp, recentOps } = stats;

  const memberDisplay = memberCount > 0 ? String(memberCount) : "–";
  const nextOpDisplay = nextOp ? formatCountdown(new Date(nextOp.scheduledAt)) : "–";
  const lastOpDisplay = lastOp ? lastOp.title : "–";
  const logo = logoUrl || "/images/branding/logo.png";

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-surface/50 via-fg-black to-fg-black" />
        <div className="absolute inset-0 bg-tactical-grid opacity-30" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <div className="mb-8 flex justify-center">
            <img
              src={logo}
              alt={brandName}
              width={112}
              height={112}
              className="h-28 w-28 object-contain drop-shadow-[0_0_12px_rgba(220,38,38,0.4)]"
            />
          </div>

          <h1 className="text-stencil mb-2 text-5xl text-primary md:text-7xl animate-stencil-sweep">
            {brandName}
          </h1>
          {tagline && (
            <p className="mb-2 text-xl text-text-secondary md:text-2xl">{tagline}</p>
          )}
          {description && (
            <p className="mx-auto mb-8 max-w-2xl text-text-muted">{description}</p>
          )}

          {/* Live org-status block — MFD readout strip */}
          <div className="mx-auto mb-10 mt-6 max-w-2xl border-y border-primary/30 bg-surface/40 py-3">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-0">
              <div className="flex items-center gap-2 sm:px-5">
                <span className="mfd-label">Members:</span>
                <span className="mfd-readout text-base font-semibold">{memberDisplay}</span>
              </div>
              <span className="hidden text-amber/40 sm:inline" aria-hidden="true">//</span>
              <div className="flex items-center gap-2 sm:px-5">
                <span className="mfd-label">Next Op:</span>
                <span className="mfd-readout text-base font-semibold">{nextOpDisplay}</span>
              </div>
              <span className="hidden text-amber/40 sm:inline" aria-hidden="true">//</span>
              <div className="flex items-center gap-2 sm:px-5">
                <span className="mfd-label">Last Op:</span>
                <span className="mfd-readout text-base font-semibold truncate max-w-[14rem]">{lastOpDisplay}</span>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/apply">
              <Button size="lg" className="text-base">
                <Swords className="h-5 w-5" />
                Enlist Now
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="text-base">
                Member Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Recent Operations ─────────────────────────────────────────────── */}
      <section className="border-t border-border py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-6">
            <h2 className="text-stencil mb-1 text-3xl text-primary">Recent Operations</h2>
            <p className="text-sm text-text-muted">Latest field activity. Crew shown.</p>
          </div>

          <div className="divide-y divide-border rounded-lg border border-border bg-surface stagger-children">
            {recentOps.length === 0 ? (
              <div className="px-5 py-6 text-sm text-text-muted">
                No ops yet. Be the first to crew up.
              </div>
            ) : (
              recentOps.map((op) => {
                const Icon = STATUS_ICON[op.status];
                const iconColor = STATUS_COLOR[op.status];
                const dateStr = formatOpDate(op.date);

                return (
                  <Link
                    key={op.id}
                    href={`/login?callbackUrl=/operations/${op.id}`}
                    className="stagger-item flex min-h-[3rem] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-text-primary">{op.title}</span>
                      {dateStr && (
                        <span className="font-mono tabular-nums text-xs text-text-muted">{dateStr}</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {op.crew.length > 0 && (
                        <div className="flex -space-x-2">
                          {op.crew.slice(0, 5).map((member) => (
                            <CrewAvatar
                              key={member.username}
                              name={member.displayName ?? member.username}
                              avatar={member.avatar}
                            />
                          ))}
                        </div>
                      )}
                      {op.signupCount > 0 && (
                        <span className="font-mono tabular-nums text-xs text-text-muted">{op.signupCount}</span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-stencil mb-4 text-3xl text-primary">Ready to Serve?</h2>
          <p className="mb-8 text-text-secondary">
            Submit your application and begin your journey with {brandName}.
          </p>
          <Link href="/apply">
            <Button size="lg">
              Apply for Enlistment
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface/50 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <img src={logo} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
            <span className="text-stencil text-sm text-text-muted">{brandName}</span>
          </div>
          {tagline && <p className="mt-2 text-xs text-text-muted">{tagline}</p>}
        </div>
      </footer>
    </div>
  );
}
