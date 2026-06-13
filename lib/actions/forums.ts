"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import {
  createThreadCore,
  createPostCore,
  editPostCore,
  deletePostCore,
  setThreadPinLockCore,
  createCategoryCore,
  deleteCategoryCore,
} from "./forums-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function createThreadAction(input: {
  categoryId: string;
  title: string;
  content: string;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createThreadCore(c.tenantId, c.membershipId, input);
  if (r.ok) revalidatePath("/forums");
  return r;
}

export async function createPostAction(input: {
  threadId: string;
  content: string;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  return createPostCore(c.tenantId, c.membershipId, input);
}

export async function editPostAction(postId: string, content: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  return editPostCore(c.tenantId, c.membershipId, postId, content);
}

export async function deletePostAction(postId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  return deletePostCore(c.tenantId, c.membershipId, c.tier, postId);
}

export async function setThreadPinLockAction(
  threadId: string,
  patch: { isPinned?: boolean; isLocked?: boolean },
) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  return setThreadPinLockCore(c.tenantId, c.tier, threadId, patch);
}

export async function createCategoryAction(input: {
  name: string;
  slug: string;
  description?: string;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createCategoryCore(c.tenantId, c.tier, input);
  if (r.ok) revalidatePath("/forums");
  return r;
}

export async function deleteCategoryAction(categoryId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteCategoryCore(c.tenantId, c.tier, categoryId);
  if (r.ok) revalidatePath("/forums");
  return r;
}
