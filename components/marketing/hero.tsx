export function Hero() {
  return (
    <section className="relative px-6 pb-24 pt-16 sm:pb-32 sm:pt-20">
      {/* Dispatch strip */}
      <div
        className="mb-10 inline-flex items-center gap-3 border-b pb-2"
        style={{ borderColor: "var(--ink-line)" }}
      >
        <span
          className="font-mono text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--signal)" }}
        >
          ORG.HQ
        </span>
        <span style={{ color: "var(--ink-line)" }} className="text-xs">//</span>
        <span
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          STATUS: LIVE
        </span>
        <span style={{ color: "var(--ink-line)" }} className="text-xs">//</span>
        <span
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          OPEN-SOURCE
        </span>
      </div>

      {/* Left-weighted layout */}
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h1
            className="font-display mb-6 text-[clamp(2.75rem,6vw,4.5rem)] font-bold leading-none"
            style={{ color: "var(--cream)" }}
          >
            Your org runs on a real{" "}
            <span style={{ color: "var(--signal)" }}>command HQ.</span>
          </h1>

          <p
            className="mb-8 max-w-lg text-lg leading-relaxed"
            style={{ color: "var(--muted)" }}
          >
            Freedom Guard already runs on it. Open-source under AGPL. Per-org isolated at
            the database level. Nine built-in modules. Live in minutes.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="/start-org"
              style={{ background: "var(--signal)", color: "var(--signal-ink)" }}
              className="font-display inline-block rounded px-7 py-3.5 text-sm font-semibold transition-colors hover:opacity-90"
            >
              Start your org
            </a>
            <a
              href="/features"
              style={{ borderColor: "var(--ink-line)", color: "var(--muted)" }}
              className="font-display inline-block rounded border px-7 py-3.5 text-sm font-semibold transition-colors hover:border-[color:var(--cream)] hover:text-[color:var(--cream)]"
            >
              See features
            </a>
          </div>
        </div>

        {/* Hairline framing element */}
        <div
          className="mt-16 border-t"
          style={{ borderColor: "var(--ink-line)" }}
        />
      </div>
    </section>
  );
}
