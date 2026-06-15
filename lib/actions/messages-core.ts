import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { checkRateLimit, CONTENT_LIMIT } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Find the existing 1:1 conversation between the viewer and `otherUsername`,
 * or create one. Cannot DM yourself. Both must be members of the org (RLS).
 */
export async function startConversationCore(
  tenantId: string, membershipId: string, otherUsername: string,
): Promise<Result<{ id: string }>> {
  const uname = otherUsername.trim();
  if (!uname) return { ok: false, error: "Pick someone to message" };

  const ctx = makeTenantContext(tenantId);
  const other = await db(ctx).membership.findFirst({ where: { username: uname }, select: { id: true } });
  if (!other) return { ok: false, error: `No member named "${uname}"` };
  if (other.id === membershipId) return { ok: false, error: "You can't message yourself" };

  // Existing 1:1 conversation containing exactly these two participants.
  const existing = await db(ctx).conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { membershipId } } },
        { participants: { some: { membershipId: other.id } } },
      ],
    },
    select: { id: true, participants: { select: { membershipId: true } } },
  });
  const match = existing && existing.participants.length === 2 ? existing : null;
  if (match) return { ok: true, id: match.id };

  const conv = await db(ctx).conversation.create({
    data: {
      tenantId,
      participants: {
        create: [
          { tenantId, membershipId },
          { tenantId, membershipId: other.id },
        ],
      },
    },
    select: { id: true },
  });
  return { ok: true, id: conv.id };
}

const BodySchema = z.string().trim().min(1, "Message can't be empty").max(5000);

/** Send a message. Viewer must be a participant. Bumps lastMessageAt + marks own read. */
export async function sendMessageCore(
  tenantId: string, membershipId: string, conversationId: string, body: string,
): Promise<Result<{ id: string }>> {
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { allowed } = checkRateLimit(`msg:${membershipId}`, CONTENT_LIMIT.maxRequests, CONTENT_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many messages — slow down" };

  const ctx = makeTenantContext(tenantId);
  const part = await db(ctx).conversationParticipant.findFirst({
    where: { conversationId, membershipId }, select: { id: true },
  });
  if (!part) return { ok: false, error: "Conversation not found" };

  const now = new Date();
  const msg = await db(ctx).message.create({
    data: { tenantId, conversationId, senderId: membershipId, body: parsed.data },
    select: { id: true },
  });
  await db(ctx).conversation.updateMany({ where: { id: conversationId }, data: { lastMessageAt: now } });
  await db(ctx).conversationParticipant.updateMany({ where: { id: part.id }, data: { lastReadAt: now } });
  return { ok: true, id: msg.id };
}

/** Mark a conversation read for the viewer. */
export async function markReadCore(
  tenantId: string, membershipId: string, conversationId: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  const res = await db(ctx).conversationParticipant.updateMany({
    where: { conversationId, membershipId }, data: { lastReadAt: new Date() },
  });
  if (res.count === 0) return { ok: false, error: "Conversation not found" };
  return { ok: true };
}
