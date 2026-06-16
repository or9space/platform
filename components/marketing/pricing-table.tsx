import { buildPlanMatrix } from "@/lib/marketing/features";

export function PricingTable() {
  const rows = buildPlanMatrix();
  const featureRows = rows.filter((r) => r.key !== "ads");
  const paidOnlyKeys = rows.filter((r) => r.paidOnly).map((r) => r.label);

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        {/* Section head */}
        <div
          className="mb-8 border-b pb-4"
          style={{ borderColor: "var(--ink-line)" }}
        >
          <h2
            className="font-display text-2xl font-bold"
            style={{ color: "var(--cream)" }}
          >
            Plans
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Free tier is ad-supported. Paid removes ads and unlocks paid-only features
            {paidOnlyKeys.length > 0 && (
              <> ({paidOnlyKeys.join(", ")})</>
            )}.
          </p>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr
                className="border-b"
                style={{
                  background: "var(--ink-raised)",
                  borderColor: "var(--ink-line)",
                }}
              >
                <th
                  className="px-5 py-3 text-left"
                  style={{ color: "var(--muted)" }}
                >
                  <span className="font-display text-xs font-semibold uppercase tracking-wide">
                    Feature
                  </span>
                </th>
                <th
                  className="px-5 py-3 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  <span className="font-display text-xs font-semibold uppercase tracking-wide">
                    Free
                  </span>
                </th>
                <th className="px-5 py-3 text-center">
                  <span
                    className="font-display text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--signal)" }}
                  >
                    Hosted
                  </span>
                </th>
                <th className="px-5 py-3 text-center" style={{ color: "var(--muted)" }}>
                  <span className="font-display text-xs font-semibold uppercase tracking-wide">
                    Self-Hosted
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b"
                  style={{ borderColor: "var(--ink-line)" }}
                >
                  <td className="px-5 py-3.5" style={{ color: "var(--cream)" }}>
                    {row.label}
                    {row.paidOnly && (
                      <span
                        className="ml-2 rounded px-1.5 py-0.5 text-xs"
                        style={{
                          background: "var(--ink-raised)",
                          color: "var(--signal)",
                        }}
                      >
                        paid only
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {row.free ? (
                      <span style={{ color: "var(--signal)" }}>✓</span>
                    ) : (
                      <span style={{ color: "var(--ink-line)" }}>—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {row.paid ? (
                      <span style={{ color: "var(--signal)" }}>✓</span>
                    ) : (
                      <span style={{ color: "var(--ink-line)" }}>—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {row.selfHosted ? (
                      <span style={{ color: "var(--signal)" }}>✓</span>
                    ) : (
                      <span style={{ color: "var(--ink-line)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {/* Ads row */}
              <tr className="border-b" style={{ borderColor: "var(--ink-line)" }}>
                <td className="px-5 py-3.5" style={{ color: "var(--cream)" }}>
                  Ads
                  <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>
                    (removed on paid)
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center text-xs" style={{ color: "var(--muted)" }}>
                  shown
                </td>
                <td className="px-5 py-3.5 text-center" style={{ color: "var(--signal)" }}>
                  ✓ removed
                </td>
                <td className="px-5 py-3.5 text-center" style={{ color: "var(--signal)" }}>
                  ✓ removed
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Column footers */}
        <div
          className="mt-8 grid gap-6 border-t pt-8 sm:grid-cols-3"
          style={{ borderColor: "var(--ink-line)" }}
        >
          <div
            className="border-t-2 pt-4"
            style={{ borderColor: "var(--ink-line)" }}
          >
            <p
              className="font-display mb-1 text-base font-semibold"
              style={{ color: "var(--cream)" }}
            >
              Free
            </p>
            <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
              Ad-supported. Self-host free under AGPL.
            </p>
            <a
              href="/start-org"
              style={{ borderColor: "var(--ink-line)", color: "var(--muted)" }}
              className="font-display inline-block rounded border px-5 py-2 text-sm font-semibold transition-colors hover:border-[color:var(--cream)] hover:text-[color:var(--cream)]"
            >
              Start free
            </a>
          </div>

          <div
            className="border-t-2 pt-4"
            style={{ borderColor: "var(--signal)" }}
          >
            <p
              className="font-display mb-1 text-base font-semibold"
              style={{ color: "var(--signal)" }}
            >
              Hosted
            </p>
            <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
              Ads off. Paid-only features. Low monthly rate.
            </p>
            <a
              href="/start-org"
              style={{ background: "var(--signal)", color: "var(--signal-ink)" }}
              className="font-display inline-block rounded px-5 py-2 text-sm font-semibold transition-colors hover:opacity-90"
            >
              Start your org
            </a>
          </div>

          <div
            className="border-t-2 pt-4"
            style={{ borderColor: "var(--ink-line)" }}
          >
            <p
              className="font-display mb-1 text-base font-semibold"
              style={{ color: "var(--cream)" }}
            >
              Self-Hosted
            </p>
            <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
              Run it yourself under AGPL. Full features, ads off, no billing.
            </p>
            <a
              href="https://github.com/or9space/platform"
              target="_blank"
              rel="noopener noreferrer"
              style={{ borderColor: "var(--ink-line)", color: "var(--muted)" }}
              className="font-display inline-block rounded border px-5 py-2 text-sm font-semibold transition-colors hover:border-[color:var(--cream)] hover:text-[color:var(--cream)]"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
