import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { listConversations } from "@/lib/queries/messages";
import { TwoPaneMessages } from "@/components/messages/two-pane-messages";
import { MessageSquare } from "lucide-react";

export default async function MessagesPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();

  const convos = await listConversations(makeTenantContext(ctx.tenant.id), viewer.id);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* page header */}
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <MessageSquare className="h-4 w-4" />
        </span>
        <div>
          <h1 className="text-base font-bold text-text-primary leading-tight">Messages</h1>
          <p className="text-xs text-text-muted">Direct communications with org members</p>
        </div>
      </div>

      {/* two-pane body */}
      <TwoPaneMessages conversations={convos} />
    </div>
  );
}
