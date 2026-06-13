export function MarketingFooter() {
  return (
    <footer className="border-t border-neutral-800 bg-neutral-950 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-lg font-bold tracking-tight text-white">or9.space</span>
          <nav className="flex flex-wrap gap-5 text-sm text-neutral-400">
            <a href="/features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="/pricing" className="transition-colors hover:text-white">
              Pricing
            </a>
            <a href="/about" className="transition-colors hover:text-white">
              About
            </a>
            <a href="/start-org" className="transition-colors hover:text-white">
              Start your org
            </a>
          </nav>
        </div>
        <div className="flex flex-col gap-1 text-xs text-neutral-600 sm:flex-row sm:items-center sm:gap-3">
          <span>© 2026 or9.space</span>
          <span className="hidden sm:inline">·</span>
          <a
            href="https://github.com/or9space/platform"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-neutral-400"
          >
            Open source (AGPL-3.0)
          </a>
        </div>
      </div>
    </footer>
  );
}
