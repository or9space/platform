export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-neutral-800 bg-neutral-950 px-6 py-24 sm:py-32">
      {/* Subtle radial gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(220,38,38,0.12),transparent)]"
      />
      <div className="relative mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
          Command headquarters for your org
        </h1>
        <p className="mx-auto max-w-xl text-lg text-neutral-400">
          or9.space is a configurable, multi-tenant platform that gives serious Star Citizen orgs a private space for forums, members, treasury, loot, fleet, and more.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/start-org"
            className="inline-block rounded bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500"
          >
            Start your org
          </a>
          <a
            href="/features"
            className="inline-block rounded border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
          >
            See features
          </a>
        </div>
      </div>
    </section>
  );
}
