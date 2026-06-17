import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { listConversations } from "@/lib/queries/messages";
import { NewConversationForm } from "@/components/messages/messages-client";
import { MfdPanel } from "@/components/ui/mfd";
import { MessageSquare } from "lucide-react";

export default async function MessagesPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();

  const convos = await listConversations(makeTenantContext(ctx.tenant.id), viewer.id);

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Messages</h1>
          <p className="text-sm text-text-muted">Direct communications with org members</p>
        </div>
      </div>

      {/* New conversation action */}
      <div className="flex justify-end">
        <NewConversationForm />
      </div>

      {/* Conversations panel */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ CONVERSATIONS ]</span>}
        titleAside={<span className="mfd-readout text-xs">{convos.length}</span>}
        bodyPadding="none"
      >
        {convos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <MessageSquare className="h-8 w-8 text-text-muted opacity-40" />
            <p className="mfd-label">NO CONVERSATIONS YET</p>
            <p className="text-xs text-text-muted">Start a new message above to contact a member.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {convos.map((c) => (
              <li key={c.id}>
                <a href={`/messages/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-surface-elevated">
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary">
                      {c.otherName}
                      {c.unread > 0 && <span className="ml-2 rounded-full bg-success/20 px-2 py-0.5 text-xs font-semibold text-success">{c.unread}</span>}
                    </p>
                    {c.lastMessage && <p className="mt-0.5 truncate text-sm text-text-muted">{c.lastMessage}</p>}
                  </div>
                  <span className="shrink-0 mfd-label text-xs text-text-muted">OPEN &rsaquo;</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </MfdPanel>
    </div>
  );
}
