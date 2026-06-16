import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listHandbooks } from "@/lib/queries/handbook";
import { L } from "@/components/l";
import { CreateHandbookForm } from "./create-handbook-form";

export default async function HandbookPage() {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  if (!viewer) notFound();

  const isCommand = hasTier(viewer.tier, "COMMAND");

  const ctx = makeTenantContext(tenant.id);
  const handbooks = await listHandbooks(ctx, { publishedOnly: !isCommand });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          <L k="handbookNoun" fallback="Handbook" />
        </h1>
      </div>

      {isCommand && (
        <div className="mb-6">
          <CreateHandbookForm />
        </div>
      )}

      {handbooks.length === 0 ? (
        <p className="text-text-secondary">No handbooks available.</p>
      ) : (
        <ul className="space-y-3">
          {handbooks.map((h) => (
            <li key={h.id}>
              <a
                href={`/handbook/${h.slug}`}
                className="flex items-start justify-between rounded border border-border p-4 hover:border-primary"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{h.title}</p>
                  {h.subtitle && (
                    <p className="mt-1 text-sm text-text-secondary">{h.subtitle}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">v{h.version}</p>
                </div>
                {isCommand && h.status !== "PUBLISHED" && (
                  <span
                    className={
                      h.status === "DRAFT"
                        ? "ml-4 shrink-0 rounded px-2 py-0.5 text-xs font-semibold bg-yellow-900/50 text-yellow-300"
                        : "ml-4 shrink-0 rounded px-2 py-0.5 text-xs font-semibold bg-surface-elevated text-text-secondary"
                    }
                  >
                    {h.status}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
