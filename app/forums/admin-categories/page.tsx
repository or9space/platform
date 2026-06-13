import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getCategories } from "@/lib/queries/forums";
import { CategoryManager } from "./category-manager";

export default async function AdminCategoriesPage() {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  if (!viewer || !hasTier(viewer.tier, "COMMAND")) notFound();

  const ctx = makeTenantContext(tenant.id);
  const categories = await getCategories(ctx);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-1">
        <a href="/forums" className="text-sm text-neutral-400 hover:text-neutral-200">Forums</a>
        <span className="mx-2 text-neutral-600">/</span>
        <span className="text-sm text-neutral-300">Manage categories</span>
      </div>

      <h1 className="mb-6 text-2xl font-bold">Forum categories</h1>

      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description ?? null,
        }))}
      />
    </main>
  );
}
