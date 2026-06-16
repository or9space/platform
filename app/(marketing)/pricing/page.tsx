import { PricingTable } from "@/components/marketing/pricing-table";
import { buildPlanMatrix } from "@/lib/marketing/features";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata = { title: "Pricing — or9.space" };

export default function PricingPage() {
  const paidOnlyFeatures = buildPlanMatrix()
    .filter((r) => r.paidOnly)
    .map((r) => r.label);

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
              ORG.HQ // PRICING
            </span>
            <h1
              className="font-display text-4xl font-bold"
              style={{ color: "var(--cream)" }}
            >
              Transparent pricing.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed" style={{ color: "var(--muted)" }}>
              Free runs a real community. Paid unlocks the full operations HQ and removes ads. Self-host the whole thing under AGPL.
            </p>
          </div>
        </section>
        <PricingTable />
        <section
          className="border-t px-6 py-10"
          style={{ borderColor: "var(--ink-line)" }}
        >
          <div className="mx-auto max-w-6xl space-y-3 text-sm" style={{ color: "var(--muted)" }}>
            <p>
              <strong style={{ color: "var(--cream)" }}>Free tier</strong> — ad-supported community
              starter: forums, events, news, activity feed, handbook, and recruitment, plus the
              members roster and org directory. No cost.
            </p>
            <p>
              <strong style={{ color: "var(--cream)" }}>Paid tier</strong> — removes ads across the
              entire org and unlocks the full operations HQ
              {paidOnlyFeatures.length > 0 && (
                <> ({paidOnlyFeatures.join(", ")})</>
              )}.
            </p>
            <p>
              <strong style={{ color: "var(--cream)" }}>Self-hosted</strong> — run the open-core
              build yourself under AGPL: every feature, no ads, no billing.
            </p>
            <p>
              Questions? Reach us on{" "}
              <a
                href="https://github.com/or9space/platform/discussions"
                style={{ color: "var(--cream)" }}
                className="underline hover:opacity-80"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Discussions
              </a>
              .
            </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
