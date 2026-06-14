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
    detail: "Self-host free. Hosted is ad-supported free, or paid with extras.",
  },
];

export function ProofBand() {
  return (
    <section className="border-y px-6 py-10" style={{ borderColor: "var(--ink-line)" }}>
      {/* Hairline-separated columns (gap-px over an ink-line bg) — the amber
          index numeral is the leading affordance; no side-stripe borders. */}
      <div
        className="mx-auto grid max-w-6xl gap-px sm:grid-cols-3"
        style={{ background: "var(--ink-line)" }}
      >
        {PROOFS.map((proof) => (
          <div
            key={proof.index}
            className="flex flex-col gap-1.5 px-5 py-2"
            style={{ background: "var(--ink)" }}
          >
            <span className="font-display text-3xl font-bold leading-none" style={{ color: "var(--signal)" }}>
              {proof.index}
            </span>
            <span className="font-display text-sm font-semibold" style={{ color: "var(--cream)" }}>
              {proof.label}
            </span>
            <span className="text-sm leading-snug" style={{ color: "var(--muted)" }}>
              {proof.detail}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
