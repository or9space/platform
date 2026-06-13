import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata = { title: "About — or9.space" };

export default function AboutPage() {
  return (
    <>
      <MarketingNav />
      <main className="mx-auto max-w-2xl px-6 py-16 space-y-10">
        <header className="space-y-3">
          <h1 className="text-4xl font-bold text-white">About or9.space</h1>
          <p className="text-lg text-neutral-400">
            A configurable, multi-tenant org-HQ platform built for serious Star Citizen crews.
          </p>
        </header>

        <section className="space-y-4 text-neutral-400">
          <h2 className="text-xl font-semibold text-white">What it is</h2>
          <p>
            or9.space gives each org its own private subdomain with a full suite of tools —
            forums, member rosters with rank tiers, a treasury ledger, loot point tracking,
            versioned handbooks, inventory management, fleet rosters, and tournament brackets.
            Every feature is independently configurable per org.
          </p>
          <p>
            There is no shared feed and no cross-org visibility. Your data belongs to your org.
          </p>
        </section>

        <section className="space-y-4 text-neutral-400">
          <h2 className="text-xl font-semibold text-white">Open-core model</h2>
          <p>
            The platform is open source under the{" "}
            <a
              href="https://github.com/or9space/platform"
              className="text-white underline underline-offset-2 hover:text-neutral-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              AGPL-3.0 license
            </a>
            . The core modules are available to every org on the free tier. The hosted service
            adds managed infrastructure, automatic backups, and paid-tier features such as the
            Discord bot integration.
          </p>
          <p>
            Self-hosting is supported for organizations that prefer to run their own instance.
          </p>
        </section>

        <section className="space-y-4 text-neutral-400">
          <h2 className="text-xl font-semibold text-white">Who it is for</h2>
          <p>
            or9.space is designed for established orgs that have outgrown spreadsheets and
            Discord channels. It works best for crews of ten or more who need structured
            communication, transparent finances, and a single place their members can check
            for org information.
          </p>
        </section>

        <div className="pt-4">
          <a
            href="/start-org"
            className="inline-block rounded bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500"
          >
            Start your org
          </a>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
