const PROOFS = [
  {
    index: "01",
    label: "One org live",
    detail: "Freedom Guard runs on the hosted platform now.",
  },
  {
    index: "09",
    label: "Nine modules",
    detail: "Forums, ranks, treasury, loot, handbook, inventory, fleet, tournaments, integrations.",
  },
  {
    index: "AGPL",
    label: "Open source",
    detail: "Self-host free. Hosted service is ad-supported free or paid with extras.",
  },
];

export function ProofBand() {
  return (
    <section
      className="border-y px-6 py-10"
      style={{ borderColor: "var(--ink-line)" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-3">
          {PROOFS.map((proof) => (
            <div
              key={proof.index}
              className="flex flex-col gap-1 border-l pl-5"
              style={{ borderColor: "var(--signal)" }}
            >
              <span
                className="font-display text-2xl font-bold"
                style={{ color: "var(--signal)" }}
              >
                {proof.index}
              </span>
              <span
                className="font-display text-sm font-semibold"
                style={{ color: "var(--cream)" }}
              >
                {proof.label}
              </span>
              <span className="text-sm leading-snug" style={{ color: "var(--muted)" }}>
                {proof.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
