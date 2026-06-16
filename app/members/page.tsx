import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listMembers } from "@/lib/queries/members";
import { Rank } from "@/components/rank";
import { L } from "@/components/l";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);

  const { q } = await searchParams;
  const ctx = makeTenantContext(tenant.id);
  const members = await listMembers(ctx, q);

  const canManageRanks = viewer ? hasTier(viewer.tier, "COMMAND") : false;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          <L k="memberPlural" fallback="Members" />
        </h1>
        {canManageRanks && (
          <a
            href="/admin/members"
            className="rounded border border-border-light px-3 py-1.5 text-sm hover:border-primary"
          >
            Manage ranks
          </a>
        )}
      </div>

      <form method="GET" className="mb-6">
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search members…"
            className="flex-1 rounded border border-border-light bg-surface px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded border border-border-light px-4 py-2 text-sm hover:border-primary"
          >
            Search
          </button>
        </div>
      </form>

      {members.length === 0 ? (
        <p className="text-text-secondary">No members found.</p>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id}>
              <a
                href={`/members/${m.username}`}
                className="flex items-center gap-4 rounded border border-border p-4 hover:border-primary"
              >
                <div className="shrink-0">
                  {m.avatarUrl && m.avatarUrl.startsWith("http") ? (
                    <img
                      src={m.avatarUrl}
                      alt={m.displayName ?? m.username}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated text-sm font-semibold uppercase">
                      {(m.displayName ?? m.username).slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.displayName ?? m.username}</p>
                  <p className="text-sm text-text-secondary">@{m.username}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-text-secondary">
                    <Rank tier={m.tier} />
                  </p>
                  <p className="text-xs text-text-muted">
                    Joined {m.createdAt.toISOString().slice(0, 10)}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
