import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { getThreadsByCategory } from "@/lib/queries/forums";
import { NewThreadForm } from "./new-thread-form";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;

  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);

  const ctx = makeTenantContext(tenant.id);
  const data = await getThreadsByCategory(ctx, categorySlug);
  if (!data) notFound();

  const { category, threads } = data;
  const isLoggedIn = viewer !== null;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-1">
        <a href="/forums" className="text-sm text-neutral-400 hover:text-neutral-200">Forums</a>
        <span className="mx-2 text-neutral-600">/</span>
        <span className="text-sm text-neutral-300">{category.name}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-1 text-neutral-400">{category.description}</p>
        )}
      </div>

      {threads.length === 0 ? (
        <p className="mb-6 text-neutral-400">No threads yet. Be the first to post.</p>
      ) : (
        <ul className="mb-8 space-y-2">
          {threads.map((t) => (
            <li key={t.id} className="rounded border border-neutral-800 p-4 hover:border-neutral-600">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.isPinned && (
                      <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-xs">Pinned</span>
                    )}
                    {t.isLocked && (
                      <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-xs">Locked</span>
                    )}
                    <a
                      href={`/forums/${categorySlug}/${t.id}`}
                      className="font-semibold hover:underline"
                    >
                      {t.title}
                    </a>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    by {t.authorName} · {t.postCount} {t.postCount === 1 ? "reply" : "replies"}
                    {t.lastPostAt && (
                      <> · last post {t.lastPostAt.toISOString().slice(0, 16).replace("T", " ")}</>
                    )}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isLoggedIn ? (
        <div className="rounded border border-neutral-800 p-4">
          <h2 className="mb-3 font-semibold">New thread</h2>
          <NewThreadForm categoryId={category.id} />
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          <a href="/login" className="underline">Sign in</a> to start a thread.
        </p>
      )}
    </main>
  );
}
