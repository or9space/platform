export function MarketingFooter() {
  return (
    <footer
      className="border-t px-6 py-10"
      style={{ borderColor: "var(--ink-line)", background: "var(--ink)" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <span
            className="font-display text-lg font-bold"
            style={{ color: "var(--cream)" }}
          >
            OR9.SPACE
          </span>
          <nav className="flex flex-wrap gap-5">
            {[
              { href: "/features", label: "Features" },
              { href: "/pricing", label: "Pricing" },
              { href: "/about", label: "About" },
              { href: "/start-org", label: "Start your org" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                style={{ color: "var(--muted)" }}
                className="font-display text-xs font-semibold uppercase tracking-wide transition-colors hover:text-[color:var(--cream)]"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div
          className="mt-6 flex flex-col gap-1 border-t pt-6 text-xs sm:flex-row sm:items-center sm:gap-3"
          style={{ borderColor: "var(--ink-line)", color: "var(--muted)" }}
        >
          <span>© 2026 or9.space</span>
          <span className="hidden sm:inline" style={{ color: "var(--ink-line)" }}>·</span>
          <a
            href="https://github.com/or9space/platform"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[color:var(--cream)]"
          >
            Open source (AGPL-3.0)
          </a>
          <span className="hidden sm:inline" style={{ color: "var(--ink-line)" }}>·</span>
          <a
            href="https://github.com/or9space/platform"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[color:var(--cream)]"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
