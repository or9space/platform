/**
 * Support ticket core logic — NO auth imports.
 *
 * Vitest-safety deviation (documented): next-auth → next/server cannot be
 * imported under vitest/happy-dom. getSessionAccountId lives in lib/auth.ts
 * which transitively imports next/server. To keep the core logic testable,
 * all DB + rate-limit + email operations are isolated here with no auth
 * dependency. Session-bound server actions live in lib/actions/support.ts
 * and are NOT imported by integration tests.
 */

import { z } from "zod";
import { prismaGlobal } from "./db";
import { checkRateLimit, SUPPORT_TICKET_LIMIT } from "./rate-limit";
import { sendEmail } from "./email";

const TicketSchema = z.object({
  subject: z.string().min(2).max(200),
  body: z.string().min(1).max(5000),
  tenantContextId: z.string().nullable(),
});

const ReplySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(1).max(5000),
  isAdmin: z.boolean(),
});

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function createTicketCore(
  accountId: string,
  input: z.infer<typeof TicketSchema>,
): Promise<Result<{ ticketId: string }>> {
  const parsed = TicketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { allowed } = checkRateLimit(
    `support:${accountId}`,
    SUPPORT_TICKET_LIMIT.maxRequests,
    SUPPORT_TICKET_LIMIT.windowMs,
  );
  if (!allowed) return { ok: false, error: "Ticket limit reached for today" };

  const ticket = await prismaGlobal.supportTicket.create({
    data: {
      accountId,
      subject: parsed.data.subject,
      tenantContextId: parsed.data.tenantContextId,
      messages: { create: { accountId, body: parsed.data.body, isAdminReply: false } },
    },
  });

  await sendEmail({
    to: process.env.PLATFORM_ADMIN_EMAILS?.split(",")[0]?.trim() ?? "dsmereski@gmail.com",
    subject: `or9 support: ${parsed.data.subject}`,
    text: `New ticket from account ${accountId}\n\n${parsed.data.body}\n\nhttps://admin.or9.space/support/${ticket.id}`,
  });

  return { ok: true, ticketId: ticket.id };
}

export async function replyTicketCore(
  actorAccountId: string,
  input: z.infer<typeof ReplySchema>,
): Promise<Result> {
  const parsed = ReplySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { ticketId, body, isAdmin } = parsed.data;

  const ticket = await prismaGlobal.supportTicket.findUnique({
    where: { id: ticketId },
    include: { account: { select: { email: true } } },
  });
  if (!ticket) return { ok: false, error: "Ticket not found" };
  if (ticket.status === "CLOSED") return { ok: false, error: "Ticket is closed" };
  if (!isAdmin && ticket.accountId !== actorAccountId) return { ok: false, error: "Not your ticket" };

  await prismaGlobal.supportMessage.create({
    data: { ticketId, accountId: actorAccountId, body, isAdminReply: isAdmin },
  });
  await prismaGlobal.supportTicket.update({
    where: { id: ticketId },
    data: { status: isAdmin ? "ANSWERED" : "OPEN" },
  });

  if (isAdmin) {
    await sendEmail({
      to: ticket.account.email,
      subject: `or9.space support replied: ${ticket.subject}`,
      text: `${body}\n\nView the thread: https://support.or9.space/tickets/${ticketId}`,
    });
  }
  return { ok: true };
}

export async function closeTicketCore(
  actorAccountId: string,
  ticketId: string,
  isAdmin: boolean,
): Promise<Result> {
  const ticket = await prismaGlobal.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false, error: "Ticket not found" };
  if (!isAdmin && ticket.accountId !== actorAccountId) return { ok: false, error: "Not your ticket" };
  await prismaGlobal.supportTicket.update({
    where: { id: ticketId },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  return { ok: true };
}
