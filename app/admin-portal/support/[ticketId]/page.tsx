import { notFound } from "next/navigation";
import { prismaGlobal } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { AdminReplyForm } from "./admin-reply-form";

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  // Defense in depth: the admin-portal layout already gates, but never run a
  // tenant-spanning query without an independent admin check on the page too.
  await requirePlatformAdmin();
  const { ticketId } = await params;
  const ticket = await prismaGlobal.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      account: { select: { email: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ticket.subject}</h1>
      <p className="text-sm text-text-secondary">{ticket.account.email} · {ticket.status}
        {ticket.tenantContextId && <> · tenant ctx: <code>{ticket.tenantContextId}</code></>}
      </p>
      <ul className="space-y-3">
        {ticket.messages.map((m) => (
          <li key={m.id} className={`rounded border p-3 ${m.isAdminReply ? "border-blue-900 bg-blue-950/40" : "border-border"}`}>
            <p className="mb-1 text-xs text-text-muted">{m.isAdminReply ? "or9 support" : "requester"} · {m.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
            <p className="whitespace-pre-wrap text-sm">{m.body}</p>
          </li>
        ))}
      </ul>
      <AdminReplyForm ticketId={ticket.id} closed={ticket.status === "CLOSED"} />
    </div>
  );
}
