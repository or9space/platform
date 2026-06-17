import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listHandbooks } from "@/lib/queries/handbook";
import { L } from "@/components/l";
import { CreateHandbookForm } from "./create-handbook-form";
import { MfdPanel } from "@/components/ui/mfd";
import { BookMarked } from "lucide-react";

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
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <BookMarked className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            <L k="handbookNoun" fallback="Handbook" />
          </h1>
          <p className="text-sm text-text-muted">FIELD REFERENCE DOCUMENTS</p>
        </div>
      </div>

      {isCommand && (
        <MfdPanel
          chassis="neutral"
          title={<span>[ NEW HANDBOOK ]</span>}
          bodyPadding="md"
        >
          <CreateHandbookForm />
        </MfdPanel>
      )}

      <MfdPanel
        chassis="primary"
        title={<span>[ HANDBOOK ]</span>}
        titleAside={<span className="mfd-label">{handbooks.length} records</span>}
        bodyPadding="sm"
      >
        {handbooks.length === 0 ? (
          <p className="py-4 text-sm text-text-muted">No handbooks available.</p>
        ) : (
          <ul className="space-y-2">
            {handbooks.map((h) => (
              <li key={h.id}>
                <a
                  href={`/handbook/${h.slug}`}
                  className="flex items-start justify-between gap-4 border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary mfd-cut-tl-br"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary">{h.title}</p>
                    {h.subtitle && (
                      <p className="mt-0.5 text-sm text-text-secondary">{h.subtitle}</p>
                    )}
                    <p className="mt-1 mfd-label text-xs text-text-muted">v{h.version}</p>
                  </div>
                  {isCommand && h.status !== "PUBLISHED" && (
                    <span
                      className={
                        h.status === "DRAFT"
                          ? "ml-4 shrink-0 mfd-label px-2 py-0.5 text-xs font-semibold bg-yellow-900/50 text-yellow-300"
                          : "ml-4 shrink-0 mfd-label px-2 py-0.5 text-xs font-semibold bg-surface-elevated text-text-secondary"
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
      </MfdPanel>
    </div>
  );
}
