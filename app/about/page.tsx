import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata = { title: "About — or9.space" };

export default function AboutPage() {
  return (
    <>
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-6 py-16 space-y-12">
        <header className="space-y-4">
          <span
            className="font-mono block text-xs uppercase tracking-widest"
            style={{ color: "var(--signal)" }}
          >
            ORG.HQ // ABOUT
          </span>
          <h1
            className="font-display text-5xl font-bold leading-none"
            style={{ color: "var(--cream)" }}
          >
            About or9.space
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
            A configurable, multi-tenant command HQ for serious online orgs. Built first for
            Star Citizen crews, built to generalize.
          </p>
        </header>

        <section
          className="space-y-4 border-t pt-10"
          style={{ borderColor: "var(--ink-line)" }}
        >
          <h2
            className="font-display text-xl font-semibold"
            style={{ color: "var(--cream)" }}
          >
            What it is
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            or9.space gives each org its own private subdomain with nine built-in modules:
            forums, a member roster with rank tiers, a treasury ledger with a running balance,
            loot-point tracking, versioned handbooks, an asset inventory, a fleet roster,
            tournament brackets, and Discord integration. Each module is individually configurable.
          </p>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            There is no shared feed and no cross-org visibility. Every org is isolated at
            the database level using row-level security. Your data belongs to your org.
          </p>
        </section>

        <section
          className="space-y-4 border-t pt-10"
          style={{ borderColor: "var(--ink-line)" }}
        >
          <h2
            className="font-display text-xl font-semibold"
            style={{ color: "var(--cream)" }}
          >
            Open-core model
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            The platform is open source under the{" "}
            <a
              href="https://github.com/or9space/platform"
              style={{ color: "var(--cream)" }}
              className="underline underline-offset-2 hover:opacity-80"
              target="_blank"
              rel="noopener noreferrer"
            >
              AGPL-3.0 license
            </a>
            . Core modules are available on the free tier. The hosted service adds managed
            infrastructure, ads removal, and paid-tier features including the Discord bot.
            Self-hosting is fully supported.
          </p>
        </section>

        <section
          className="space-y-4 border-t pt-10"
          style={{ borderColor: "var(--ink-line)" }}
        >
          <h2
            className="font-display text-xl font-semibold"
            style={{ color: "var(--cream)" }}
          >
            Who it is for
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            Orgs that have outgrown spreadsheets and Discord channels. Crews of ten or more
            who need structured communication, transparent finances, and one place members
            check for org information. The buyer is org leadership: a commander or officer
            who wants a HQ that looks legitimate, that members will use, that they control.
          </p>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            Freedom Guard runs on it now. Start yours in minutes.
          </p>
        </section>

        <div
          className="border-t pt-10"
          style={{ borderColor: "var(--ink-line)" }}
        >
          <a
            href="/start-org"
            style={{ background: "var(--signal)", color: "var(--signal-ink)" }}
            className="font-display inline-block rounded px-6 py-3 text-sm font-semibold transition-colors hover:opacity-90"
          >
            Start your org
          </a>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
