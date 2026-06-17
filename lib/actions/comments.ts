"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import { postCommentCore, deleteCommentCore } from "./comments-core";
import type { CommentEntity } from "@/lib/comment-entity";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function postCommentAction(
  entityType: CommentEntity,
  entityId: string,
  body: string,
  path: string,
) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await postCommentCore(c.tenantId, c.membershipId, entityType, entityId, body);
  if (r.ok) revalidatePath(path);
  return r;
}

export async function deleteCommentAction(commentId: string, path: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteCommentCore(c.tenantId, c.membershipId, c.tier, commentId);
  if (r.ok) revalidatePath(path);
  return r;
}
