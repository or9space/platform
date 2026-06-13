import { PricingTable } from "@/components/marketing/pricing-table";
import { buildPlanMatrix } from "@/lib/marketing/features";

export const metadata = { title: "Pricing — or9.space" };

export default function PricingPage() {
  const paidOnlyFeatures = buildPlanMatrix()
    .filter((r) => r.paidOnly)
    .map((r) => r.label);

  return (
    <main>
      <section className="border-b border-neutral-800 bg-neutral-950 px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-4xl font-bold text-white">Simple, transparent pricing</h1>
          <p className="text-neutral-400">
            The free tier covers everything most orgs need. Paid removes ads and unlocks
            advanced integrations for orgs that want more.
          </p>
        </div>
      </section>
      <PricingTable />
      <section className="border-t border-neutral-800 px-6 py-10">
        <div className="mx-auto max-w-2xl space-y-3 text-sm text-neutral-500">
          <p>
            <strong className="text-neutral-300">Free tier</strong> — ad-supported. All core modules (forums, handbook, loot, inventory, treasury, and more) are available at no cost.
          </p>
          <p>
            <strong className="text-neutral-300">Paid tier</strong> — removes ads across the entire org and activates paid-only features
            {paidOnlyFeatures.length > 0 && (
              <> including {paidOnlyFeatures.join(" and ")}</>
            )}.
          </p>
          <p>
            Pricing details and billing are configured during org setup. Questions? Reach us on{" "}
            <a
              href="https://github.com/or9space/platform/discussions"
              className="text-neutral-400 underline hover:text-white"
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
  );
}
