import { L } from "@/components/l";

export default function ForumsStubPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Forums</h1>
      <p className="text-neutral-400">
        Coming in Phase 3. This route is gated by the <code>forums</code> feature flag —
        a tenant with forums disabled gets a 404 here.
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        Tenant calls its members: <L k="memberPlural" fallback="Members" />.
      </p>
    </main>
  );
}
