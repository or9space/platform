"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import { startConversationCore, sendMessageCore, markReadCore } from "./messages-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id };
}

export async function startConversationAction(otherUsername: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await startConversationCore(c.tenantId, c.membershipId, otherUsername);
  if (r.ok) revalidatePath("/messages");
  return r;
}

export async function sendMessageAction(conversationId: string, body: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await sendMessageCore(c.tenantId, c.membershipId, conversationId, body);
  if (r.ok) revalidatePath(`/messages/${conversationId}`);
  return r;
}

export async function markReadAction(conversationId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  return markReadCore(c.tenantId, c.membershipId, conversationId);
}
