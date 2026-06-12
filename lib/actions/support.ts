"use server";

import { getSessionAccountId } from "../auth";
import { requirePlatformAdmin } from "../platform-admin";
import { createTicketCore, replyTicketCore, closeTicketCore } from "../support-core";

export async function createTicketAction(input: { subject: string; body: string; tenantContextId: string | null }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return { ok: false as const, error: "Sign in required" };
  return createTicketCore(accountId, input);
}

export async function replyTicketAction(ticketId: string, body: string) {
  const accountId = await getSessionAccountId();
  if (!accountId) return { ok: false as const, error: "Sign in required" };
  return replyTicketCore(accountId, { ticketId, body, isAdmin: false });
}

export async function closeTicketAction(ticketId: string) {
  const accountId = await getSessionAccountId();
  if (!accountId) return { ok: false as const, error: "Sign in required" };
  return closeTicketCore(accountId, ticketId, false);
}

export async function adminReplyTicketAction(ticketId: string, body: string) {
  const { accountId } = await requirePlatformAdmin();
  return replyTicketCore(accountId, { ticketId, body, isAdmin: true });
}

export async function adminCloseTicketAction(ticketId: string) {
  const { accountId } = await requirePlatformAdmin();
  return closeTicketCore(accountId, ticketId, true);
}
