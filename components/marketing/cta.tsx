export function Cta() {
  return (
    <section
      className="border-t px-6 py-20"
      style={{ borderColor: "var(--ink-line)", background: "var(--ink-raised)" }}
    >
      <div className="mx-auto max-w-2xl">
        <p className="mb-6 text-lg" style={{ color: "var(--muted)" }}>
          Free to start. Your crew gets a private subdomain, per-org isolated, nine modules ready to configure.
        </p>
        <a
          href="/start-org"
          style={{ background: "var(--signal)", color: "var(--signal-ink)" }}
          className="font-display inline-block rounded px-8 py-4 text-sm font-bold transition-colors hover:opacity-90"
        >
          Start your org
        </a>
      </div>
    </section>
  );
}
