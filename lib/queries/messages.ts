import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface ConversationSummary {
  id: string;
  otherName: string;
  otherUsername: string | null;
  lastMessage: string | null;
  lastMessageAt: Date;
  unread: number;
}

export interface MessageRow {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
  mine: boolean;
}

export interface ConversationThread {
  id: string;
  otherName: string;
  messages: MessageRow[];
}

/** Conversations the viewer participates in, newest activity first. */
export async function listConversations(ctx: TenantContext, membershipId: string): Promise<ConversationSummary[]> {
  const convs = await db(ctx).conversation.findMany({
    where: { participants: { some: { membershipId } } },
    orderBy: { lastMessageAt: "desc" },
    select: {
      id: true, lastMessageAt: true,
      participants: {
        select: { membershipId: true, lastReadAt: true, membership: { select: { displayName: true, username: true } } },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true } },
    },
  });

  const summaries: ConversationSummary[] = [];
  for (const c of convs) {
    const me = c.participants.find((p) => p.membershipId === membershipId);
    const other = c.participants.find((p) => p.membershipId !== membershipId);
    const since = me?.lastReadAt ?? new Date(0);
    const unread = await db(ctx).message.count({
      where: { conversationId: c.id, senderId: { not: membershipId }, createdAt: { gt: since } },
    });
    summaries.push({
      id: c.id,
      otherName: other?.membership.displayName ?? other?.membership.username ?? "Unknown",
      otherUsername: other?.membership.username ?? null,
      lastMessage: c.messages[0]?.body ?? null,
      lastMessageAt: c.lastMessageAt,
      unread,
    });
  }
  return summaries;
}

/** Full thread, guarded: returns null if the viewer is not a participant. */
export async function getConversationThread(
  ctx: TenantContext, membershipId: string, conversationId: string,
): Promise<ConversationThread | null> {
  const c = await db(ctx).conversation.findFirst({
    where: { id: conversationId, participants: { some: { membershipId } } },
    select: {
      id: true,
      participants: { select: { membershipId: true, membership: { select: { displayName: true, username: true } } } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, senderId: true, createdAt: true, sender: { select: { displayName: true, username: true } } },
      },
    },
  });
  if (!c) return null;
  const other = c.participants.find((p) => p.membershipId !== membershipId);
  return {
    id: c.id,
    otherName: other?.membership.displayName ?? other?.membership.username ?? "Unknown",
    messages: c.messages.map((m) => ({
      id: m.id, body: m.body, senderId: m.senderId,
      senderName: m.sender.displayName ?? m.sender.username,
      createdAt: m.createdAt, mine: m.senderId === membershipId,
    })),
  };
}

/** Total unread across all conversations — for a nav badge. */
export async function countUnreadMessages(ctx: TenantContext, membershipId: string): Promise<number> {
  const parts = await db(ctx).conversationParticipant.findMany({
    where: { membershipId },
    select: { conversationId: true, lastReadAt: true },
  });
  let total = 0;
  for (const p of parts) {
    total += await db(ctx).message.count({
      where: { conversationId: p.conversationId, senderId: { not: membershipId }, createdAt: { gt: p.lastReadAt ?? new Date(0) } },
    });
  }
  return total;
}
