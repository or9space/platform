import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { getHandbookBySlug, getViewerAck } from "@/lib/queries/handbook";
import { AcknowledgeButton } from "./acknowledge-button";

export default async function HandbookSlugPage({
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
  if (!viewer) notFound();

  const ctx = makeTenantContext(tenant.id);
  const hb = await getHandbookBySlug(ctx, slug);
  if (!hb) notFound();

  if (hb.status !== "PUBLISHED" && !hasTier(viewer.tier, "OFFICER")) notFound();

  const ack = hb.status === "PUBLISHED"
    ? await getViewerAck(ctx, hb.id, viewer.id)
    : null;

  const isOfficer = hasTier(viewer.tier, "OFFICER");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{hb.title}</h1>
            {hb.subtitle && (
              <p className="mt-1 text-neutral-400">{hb.subtitle}</p>
            )}
            <p className="mt-1 text-xs text-neutral-500">v{hb.version}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {isOfficer && (
              <a
                href={`/handbook/${slug}/edit`}
                className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500"
              >
                Edit
              </a>
            )}
          </div>
        </div>

        {hb.status === "PUBLISHED" && (
          <div className="mt-4">
            <AcknowledgeButton
              handbookId={hb.id}
              version={hb.version}
              ack={ack}
            />
          </div>
        )}
      </div>

      {hb.sections.length === 0 ? (
        <p className="text-neutral-400">No sections yet.</p>
      ) : (
        <div className="space-y-8">
          {hb.sections.map((section) => (
            <section key={section.id}>
              <h2 className="mb-3 text-lg font-semibold">{section.title}</h2>
              <div className="whitespace-pre-wrap text-neutral-300 leading-relaxed">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
