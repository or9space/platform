import { MARKETING_FEATURES } from "@/lib/marketing/features";

export function FeatureGrid() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MARKETING_FEATURES.map((feature) => (
            <div
              key={feature.key}
              className="rounded border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-neutral-700"
            >
              <h3 className="mb-2 font-semibold text-white">{feature.name}</h3>
              <p className="text-sm leading-relaxed text-neutral-400">{feature.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
