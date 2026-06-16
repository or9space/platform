import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { listConversations } from "@/lib/queries/messages";
import { NewConversationForm } from "@/components/messages/messages-client";

export default async function MessagesPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();

  const convos = await listConversations(makeTenantContext(ctx.tenant.id), viewer.id);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Messages</h1>
        <NewConversationForm />
      </div>

      {convos.length === 0 ? (
        <p className="text-sm text-text-muted">No conversations yet. Start one above.</p>
      ) : (
        <ul className="divide-y divide-border rounded border border-border">
          {convos.map((c) => (
            <li key={c.id}>
              <a href={`/messages/${c.id}`} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-hover/50">
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">
                    {c.otherName}
                    {c.unread > 0 && <span className="ml-2 rounded-full bg-success/20 px-2 py-0.5 text-xs font-semibold text-success">{c.unread}</span>}
                  </p>
                  {c.lastMessage && <p className="mt-0.5 truncate text-sm text-text-muted">{c.lastMessage}</p>}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
