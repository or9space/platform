export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="text-lg font-bold tracking-tight text-white">
          or9.space
        </a>
        <ul className="hidden items-center gap-6 text-sm text-neutral-400 md:flex">
          <li>
            <a href="/features" className="transition-colors hover:text-white">
              Features
            </a>
          </li>
          <li>
            <a href="/pricing" className="transition-colors hover:text-white">
              Pricing
            </a>
          </li>
          <li>
            <a href="/about" className="transition-colors hover:text-white">
              About
            </a>
          </li>
          <li>
            <a href="/orgs" className="transition-colors hover:text-white">
              Orgs
            </a>
          </li>
        </ul>
        <a
          href="/start-org"
          className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
        >
          Start your org
        </a>
      </nav>
    </header>
  );
}
