import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { getConversationThread } from "@/lib/queries/messages";
import { markReadCore } from "@/lib/actions/messages-core";
import { MessageComposer } from "@/components/messages/messages-client";

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
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <a href="/messages" className="text-sm text-neutral-400 hover:text-neutral-200">← Messages</a>
        <h1 className="text-xl font-bold">{thread.otherName}</h1>
      </div>

      <div className="space-y-2">
        {thread.messages.length === 0 ? (
          <p className="text-sm text-neutral-500">No messages yet — say hello.</p>
        ) : (
          thread.messages.map((m) => (
            <div key={m.id} className={m.mine ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.mine ? "bg-neutral-100 text-neutral-900" : "border border-neutral-800 bg-neutral-900/40 text-neutral-100"}`}>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <MessageComposer conversationId={thread.id} />
    </main>
  );
}
