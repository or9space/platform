"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import {
  createItemCore,
  updateItemCore,
  deleteItemCore,
  createHoldingCore,
  updateHoldingCore,
  deleteHoldingCore,
} from "./inventory-core";
import type { InventoryCategory, InventoryKind, HoldingState } from "../inventory";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, accountId, membershipId: m.id, tier: m.tier };
}

export async function createItemAction(input: {
  name: string;
  category: InventoryCategory;
  kind: InventoryKind;
  description?: string;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createItemCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/inventory");
  return r;
}

export async function updateItemAction(
  itemId: string,
  patch: {
    name?: string;
    category?: InventoryCategory;
    kind?: InventoryKind;
    description?: string;
  },
) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await updateItemCore(c.tenantId, c.membershipId, c.tier, itemId, patch);
  if (r.ok) revalidatePath("/inventory");
  return r;
}

export async function deleteItemAction(itemId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteItemCore(c.tenantId, c.membershipId, c.accountId, c.tier, itemId);
  if (r.ok) revalidatePath("/inventory");
  return r;
}

export async function createHoldingAction(input: {
  itemId: string;
  quantity: number;
  custodianMembershipId?: string;
  state?: HoldingState;
  notes?: string;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createHoldingCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/inventory");
  return r;
}

export async function updateHoldingAction(
  holdingId: string,
  patch: {
    quantity?: number;
    custodianMembershipId?: string | null;
    state?: HoldingState;
    notes?: string | null;
  },
) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await updateHoldingCore(c.tenantId, c.membershipId, c.tier, holdingId, patch);
  if (r.ok) revalidatePath("/inventory");
  return r;
}

export async function deleteHoldingAction(holdingId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteHoldingCore(c.tenantId, c.membershipId, c.tier, holdingId);
  if (r.ok) revalidatePath("/inventory");
  return r;
}
