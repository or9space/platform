export function Cta() {
  return (
    <section className="border-t border-neutral-800 bg-neutral-950 px-6 py-16 text-center">
      <div className="mx-auto max-w-xl space-y-5">
        <h2 className="text-3xl font-bold text-white">Ready to build your org</h2>
        <p className="text-neutral-400">
          Free to start. Your crew gets a private subdomain — forums, members, treasury, and more — live within a day.
        </p>
        <a
          href="/start-org"
          className="inline-block rounded bg-red-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500"
        >
          Start your org
        </a>
      </div>
    </section>
  );
}
