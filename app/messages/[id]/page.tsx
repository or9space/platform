import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { getConversationThread } from "@/lib/queries/messages";
import { markReadCore } from "@/lib/actions/messages-core";
import { MessageComposer } from "@/components/messages/messages-client";
import { MfdPanel } from "@/components/ui/mfd";
import { MessageSquare } from "lucide-react";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();

  const thread = await getConversationThread(makeTenantContext(ctx.tenant.id), viewer.id, id);
  if (!thread) notFound();

  // Mark read on open (best-effort; ignore failure).
  await markReadCore(ctx.tenant.id, viewer.id, id);

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div>
          <a href="/messages" className="mfd-label text-xs text-text-muted hover:text-text-primary transition-colors">
            ← MESSAGES
          </a>
          <h1 className="text-2xl font-bold text-text-primary">{thread.otherName}</h1>
        </div>
      </div>

      {/* Thread panel */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ THREAD ]</span>}
        bodyPadding="md"
      >
        <div className="space-y-2">
          {thread.messages.length === 0 ? (
            <p className="text-sm text-text-muted">No messages yet — say hello.</p>
          ) : (
            thread.messages.map((m) => (
              <div key={m.id} className={m.mine ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.mine ? "bg-primary text-fg-cream" : "border border-border bg-surface text-text-primary"}`}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </MfdPanel>

      {/* Composer panel */}
      <MfdPanel chassis="neutral" title={<span>[ COMPOSE ]</span>} bodyPadding="md">
        <MessageComposer conversationId={thread.id} />
      </MfdPanel>
    </div>
  );
}
