import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getHandbookBySlug } from "@/lib/queries/handbook";
import { UpsertSectionForm } from "./upsert-section-form";
import { DeleteSectionButton } from "./delete-section-button";
import { StatusControls } from "./status-controls";

export default async function HandbookEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  if (!viewer || !hasTier(viewer.tier, "OFFICER")) notFound();

  const ctx = makeTenantContext(tenant.id);
  const hb = await getHandbookBySlug(ctx, slug);
  if (!hb) notFound();

  const isCommand = hasTier(viewer.tier, "COMMAND");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{hb.title}</h1>
          {hb.subtitle && (
            <p className="mt-1 text-neutral-400">{hb.subtitle}</p>
          )}
          <p className="mt-1 text-xs text-neutral-500">v{hb.version} — {hb.status}</p>
        </div>
        <a
          href={`/handbook/${slug}`}
          className="shrink-0 rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500"
        >
          View
        </a>
      </div>

      {isCommand && (
        <div className="mb-6">
          <StatusControls handbookId={hb.id} currentStatus={hb.status} />
        </div>
      )}

      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Sections</h2>
        {hb.sections.length === 0 ? (
          <p className="mb-4 text-neutral-400">No sections yet.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {hb.sections.map((section) => (
              <li
                key={section.id}
                className="flex items-center justify-between rounded border border-neutral-800 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{section.title}</p>
                  <p className="text-xs text-neutral-500">Order: {section.orderIndex}</p>
                </div>
                <div className="ml-4 shrink-0">
                  <DeleteSectionButton sectionId={section.id} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded border border-neutral-800 p-4">
          <p className="mb-3 text-sm font-semibold">Add Section</p>
          <UpsertSectionForm handbookId={hb.id} />
        </div>
      </div>
    </main>
  );
}
