import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listLfg } from "@/lib/queries/lfg";
import { formatDate } from "@/lib/format";
import { LfgCreateForm, LfgRowActions } from "@/components/lfg/lfg-client";

export default async function LfgPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const isOfficer = hasTier(viewer.tier, "OFFICER");

  const posts = await listLfg(makeTenantContext(ctx.tenant.id));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Looking for group</h1>
      <LfgCreateForm />

      {posts.length === 0 ? (
        <p className="text-sm text-neutral-500">No posts yet.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => {
            const canManage = isOfficer || p.authorId === viewer.id;
            return (
              <li key={p.id} className={`rounded border p-4 ${p.status === "CLOSED" ? "border-neutral-900 opacity-60" : "border-neutral-800"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {p.status === "CLOSED" && <span className="text-xs uppercase text-neutral-500">Closed</span>}
                      <p className="font-medium text-neutral-100">{p.title}</p>
                    </div>
                    {p.body && <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-400">{p.body}</p>}
                    <p className="mt-1 text-xs text-neutral-600">
                      <a href={`/members/${p.authorUsername}`} className="hover:underline">{p.authorName}</a> · {formatDate(p.createdAt)}
                    </p>
                  </div>
                  {canManage && <LfgRowActions id={p.id} status={p.status} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
