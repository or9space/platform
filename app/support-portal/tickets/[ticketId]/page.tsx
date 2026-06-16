import { notFound } from "next/navigation";
import { getSessionAccountId } from "@/lib/auth";
import { prismaGlobal } from "@/lib/db";
import { ReplyForm } from "./reply-form";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const accountId = await getSessionAccountId();
  if (!accountId) notFound();
  const { ticketId } = await params;
  const ticket = await prismaGlobal.supportTicket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket || ticket.accountId !== accountId) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ticket.subject}
        <span className="ml-2 text-sm font-normal text-text-muted">{ticket.status}</span>
      </h1>
      <ul className="space-y-3">
        {ticket.messages.map((m) => (
          <li key={m.id} className={`rounded border p-3 ${m.isAdminReply ? "border-blue-900 bg-blue-950/40" : "border-border"}`}>
            <p className="mb-1 text-xs text-text-muted">{m.isAdminReply ? "or9 support" : "you"} · {m.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
            <p className="whitespace-pre-wrap text-sm">{m.body}</p>
          </li>
        ))}
      </ul>
      <ReplyForm ticketId={ticket.id} closed={ticket.status === "CLOSED"} />
    </div>
  );
}
