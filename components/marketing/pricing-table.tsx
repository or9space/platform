import { buildPlanMatrix } from "@/lib/marketing/features";

export function PricingTable() {
  const rows = buildPlanMatrix();
  // Separate the ads row for special treatment; show remaining features
  const featureRows = rows.filter((r) => r.key !== "ads");
  const paidOnlyKeys = rows.filter((r) => r.paidOnly).map((r) => r.label);

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 text-center text-sm text-neutral-500">
          Free tier is ad-supported. Paid removes ads and unlocks paid-only features
          {paidOnlyKeys.length > 0 && (
            <> ({paidOnlyKeys.join(", ")})</>
          )}.
        </p>

        <div className="mt-6 overflow-x-auto rounded border border-neutral-800">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900">
                <th className="px-5 py-3 text-left font-semibold text-neutral-300">Feature</th>
                <th className="px-5 py-3 text-center font-semibold text-neutral-300">Free</th>
                <th className="px-5 py-3 text-center font-semibold text-amber-400">Paid</th>
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row, i) => (
                <tr
                  key={row.key}
                  className={
                    i % 2 === 0
                      ? "border-b border-neutral-800/60 bg-neutral-950"
                      : "border-b border-neutral-800/60 bg-neutral-900/40"
                  }
                >
                  <td className="px-5 py-3 text-neutral-300">
                    {row.label}
                    {row.paidOnly && (
                      <span className="ml-2 rounded bg-amber-900/40 px-1.5 py-0.5 text-xs text-amber-400">
                        paid only
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {row.free ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {row.paid ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {/* Ads row gets special treatment */}
              <tr className="border-b border-neutral-800/60 bg-neutral-950">
                <td className="px-5 py-3 text-neutral-300">
                  Ads
                  <span className="ml-2 text-xs text-neutral-500">(removed on paid)</span>
                </td>
                <td className="px-5 py-3 text-center text-neutral-500 text-xs">shown</td>
                <td className="px-5 py-3 text-center text-green-400">✓ removed</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-neutral-800 bg-neutral-900 p-6 text-center">
            <p className="mb-1 text-lg font-bold text-white">Free</p>
            <p className="mb-4 text-sm text-neutral-400">Ad-supported. Core features included.</p>
            <a
              href="/start-org"
              className="inline-block rounded border border-neutral-700 px-5 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
            >
              Get started free
            </a>
          </div>
          <div className="rounded border border-amber-900/40 bg-neutral-900 p-6 text-center">
            <p className="mb-1 text-lg font-bold text-amber-400">Paid</p>
            <p className="mb-4 text-sm text-neutral-400">Ad-free, all features, priority support.</p>
            <a
              href="/start-org"
              className="inline-block rounded bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
            >
              Start with paid
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
