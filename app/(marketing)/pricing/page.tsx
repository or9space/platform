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
              Free covers everything most orgs need. Paid removes ads and activates advanced integrations.
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
              <strong style={{ color: "var(--cream)" }}>Free tier</strong> — ad-supported.
              All core modules (forums, handbook, loot, inventory, treasury, and more) at no cost.
            </p>
            <p>
              <strong style={{ color: "var(--cream)" }}>Paid tier</strong> — removes ads across
              the entire org and activates paid-only features
              {paidOnlyFeatures.length > 0 && (
                <> including {paidOnlyFeatures.join(" and ")}</>
              )}.
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
