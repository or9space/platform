import { StatusBoard } from "./status-board";

export function Hero() {
  return (
    <section className="relative px-6 pb-20 pt-14 sm:pb-28 sm:pt-18">
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

      {/* 2-column layout: copy left, status board right */}
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_480px]">
          {/* Left: headline + CTAs */}
          <div>
            <h1
              className="font-display mb-5 text-[clamp(3rem,7vw,5rem)] font-bold leading-[0.93]"
              style={{ color: "var(--cream)" }}
            >
              Your org runs on a real{" "}
              <span style={{ color: "var(--signal)" }}>command HQ.</span>
            </h1>

            <p
              className="mb-10 max-w-md text-lg leading-relaxed"
              style={{ color: "var(--muted)" }}
            >
              Roster, treasury, loot, fleet, forums and more. Per-org isolated. Yours in minutes.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/start-org"
                style={{ background: "var(--signal)", color: "var(--signal-ink)" }}
                className="font-display inline-block rounded px-8 py-4 text-sm font-bold transition-colors hover:opacity-90"
              >
                Start your org
              </a>
              <a
                href="/features"
                style={{ borderColor: "var(--ink-line)", color: "var(--muted)" }}
                className="font-display inline-block rounded border px-8 py-4 text-sm font-semibold transition-colors hover:border-[color:var(--cream)] hover:text-[color:var(--cream)]"
              >
                See features
              </a>
            </div>

            {/* Proof line below CTAs */}
            <p
              className="mt-8 text-sm"
              style={{ color: "var(--muted)" }}
            >
              Freedom Guard runs on it now. Open source under AGPL. Free to start.
            </p>
          </div>

          {/* Right: org HQ status board */}
          <div className="w-full">
            <StatusBoard />
          </div>
        </div>

        {/* Hairline rule at section bottom */}
        <div
          className="mt-20 border-t"
          style={{ borderColor: "var(--ink-line)" }}
        />
      </div>
    </section>
  );
}
