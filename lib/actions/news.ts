"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import { createNewsCore, updateNewsCore, deleteNewsCore, type NewsInput } from "./news-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function createNewsAction(input: NewsInput) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createNewsCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/news");
  return r;
}

export async function updateNewsAction(postId: string, input: NewsInput) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await updateNewsCore(c.tenantId, c.membershipId, c.tier, postId, input);
  if (r.ok) {
    revalidatePath("/news");
    revalidatePath(`/news/${postId}`);
  }
  return r;
}

export async function deleteNewsAction(postId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteNewsCore(c.tenantId, c.membershipId, c.tier, postId);
  if (r.ok) revalidatePath("/news");
  return r;
}
