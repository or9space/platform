import { FeatureLedger } from "@/components/marketing/feature-ledger";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata = { title: "Features — or9.space" };

export default function FeaturesPage() {
  return (
    <>
      <MarketingNav />
      <main>
        <section
          className="border-b px-6 py-16"
          style={{ borderColor: "var(--ink-line)" }}
        >
          <div className="mx-auto max-w-6xl">
            <span
              className="font-mono mb-3 block text-xs uppercase tracking-widest"
              style={{ color: "var(--signal)" }}
            >
              ORG.HQ // MODULES
            </span>
            <h1
              className="font-display text-4xl font-bold"
              style={{ color: "var(--cream)" }}
            >
              Nine modules. One HQ.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed" style={{ color: "var(--muted)" }}>
              Each module is independently configurable. Enable what your org uses, leave the rest off.
              Every feature runs inside your org's isolated subdomain, no cross-org visibility.
            </p>
          </div>
        </section>
        <FeatureLedger />
        <section
          className="border-t px-6 py-12"
          style={{ borderColor: "var(--ink-line)" }}
        >
          <div className="mx-auto max-w-6xl space-y-4 text-sm" style={{ color: "var(--muted)" }}>
            <p>
              Free orgs get all core modules with ads shown to members. Upgrading removes ads
              and activates advanced integrations (managed Discord bot on paid plans).
            </p>
            <p>
              <a href="/pricing" style={{ color: "var(--cream)" }} className="underline underline-offset-2 hover:opacity-80">
                Compare plans
              </a>
              {" "}or{" "}
              <a href="/start-org" style={{ color: "var(--cream)" }} className="underline underline-offset-2 hover:opacity-80">
                start your org now.
              </a>
            </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
