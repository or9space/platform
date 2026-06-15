"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import { createLfgCore, closeLfgCore, deleteLfgCore, type LfgInput } from "./lfg-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function createLfgAction(input: LfgInput) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createLfgCore(c.tenantId, c.membershipId, input);
  if (r.ok) revalidatePath("/lfg");
  return r;
}

export async function closeLfgAction(id: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await closeLfgCore(c.tenantId, c.membershipId, c.tier, id);
  if (r.ok) revalidatePath("/lfg");
  return r;
}

export async function deleteLfgAction(id: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteLfgCore(c.tenantId, c.membershipId, c.tier, id);
  if (r.ok) revalidatePath("/lfg");
  return r;
}
