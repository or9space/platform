import { notFound } from "next/navigation";
import { MessagesSquare } from "lucide-react";
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
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <MessagesSquare className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Forum Categories</h1>
          <p className="text-sm text-text-muted">
            <a href="/forums" className="hover:text-text-primary">Forums</a>
            <span className="mx-1.5 text-text-muted">/</span>
            Manage categories
          </p>
        </div>
      </div>

      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description ?? null,
        }))}
      />
    </div>
  );
}
