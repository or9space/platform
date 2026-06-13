import { FeatureGrid } from "@/components/marketing/feature-grid";

export const metadata = { title: "Features — or9.space" };

export default function FeaturesPage() {
  return (
    <main>
      <section className="border-b border-neutral-800 bg-neutral-950 px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-4xl font-bold text-white">Everything your org needs</h1>
          <p className="text-neutral-400">
            or9.space ships with a modular set of tools purpose-built for organized crews. Each
            feature is independently configurable — enable what your org uses, ignore the rest.
          </p>
        </div>
      </section>
      <FeatureGrid />
      <section className="border-t border-neutral-800 px-6 py-12">
        <div className="mx-auto max-w-2xl space-y-4 text-neutral-400">
          <p>
            Every feature is built with tenancy in mind. Your org data is isolated from every other org on the platform — there is no shared feed, no cross-org visibility, and no global namespace.
          </p>
          <p>
            Free orgs get full access to core features with ads shown to members. Upgrading to a paid plan removes all ads and enables advanced integrations such as a managed Discord bot.
          </p>
          <p>
            <a href="/pricing" className="text-white underline underline-offset-2 hover:text-neutral-300">
              Compare plans
            </a>{" "}
            or{" "}
            <a href="/start-org" className="text-white underline underline-offset-2 hover:text-neutral-300">
              start your org now.
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
