"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import { createTreasuryEntryCore, deleteTreasuryEntryCore } from "./treasury-core";
import type { TreasuryType, TreasuryCategory } from "../treasury";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, accountId, membershipId: m.id, tier: m.tier };
}

export async function createTreasuryEntryAction(input: { type: TreasuryType; category: TreasuryCategory; amount: number; description: string }) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createTreasuryEntryCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/treasury");
  return r;
}

export async function deleteTreasuryEntryAction(entryId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteTreasuryEntryCore(c.tenantId, c.accountId, c.tier, entryId);
  if (r.ok) revalidatePath("/treasury");
  return r;
}
