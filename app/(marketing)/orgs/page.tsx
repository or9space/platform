import { listPublicOrgs } from "@/lib/queries/directory";

export const dynamic = "force-dynamic";

export default async function OrgsPage() {
  const orgs = await listPublicOrgs();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold text-white">Orgs on or9.space</h1>
      <p className="mt-3 text-neutral-400">
        Discover communities and organizations using the or9.space platform.
      </p>

      {orgs.length === 0 ? (
        <div className="mt-12 text-center text-neutral-400">
          <p className="text-lg">No public orgs yet. Be the first —{" "}
            <a href="/start-org" className="text-red-400 underline hover:text-red-300">
              start your org
            </a>.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => (
            <a
              key={o.slug}
              // TODO: derive apex domain from env for non-prod
              href={`https://${o.slug}.or9.space`}
              target="_self"
              className="block rounded-lg border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-neutral-600 hover:bg-neutral-800"
            >
              <h2 className="font-semibold text-white">{o.name}</h2>
              {o.tagline ? (
                <p className="mt-1 text-sm text-neutral-400">{o.tagline}</p>
              ) : (
                <p className="mt-1 text-sm text-neutral-600">—</p>
              )}
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
