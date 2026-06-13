import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getCategories } from "@/lib/queries/forums";

export default async function ForumsPage() {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  const canManageCategories = viewer ? hasTier(viewer.tier, "COMMAND") : false;

  const ctx = makeTenantContext(tenant.id);
  const categories = await getCategories(ctx);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Forums</h1>
        {canManageCategories && (
          <a
            href="/forums/admin-categories"
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500"
          >
            Manage categories
          </a>
        )}
      </div>

      {categories.length === 0 ? (
        <p className="text-neutral-400">No categories yet.</p>
      ) : (
        <ul className="space-y-3">
          {categories.map((cat) => (
            <li key={cat.id}>
              <a
                href={`/forums/${cat.slug}`}
                className="block rounded border border-neutral-800 p-4 hover:border-neutral-600"
              >
                <p className="font-semibold">{cat.name}</p>
                {cat.description && (
                  <p className="mt-1 text-sm text-neutral-400">{cat.description}</p>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
