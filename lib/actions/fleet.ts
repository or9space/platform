"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import { addShipCore, updateShipCore, deleteShipCore } from "./fleet-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, accountId, membershipId: m.id, tier: m.tier };
}

export async function addShipAction(input: {
  shipName: string;
  manufacturer?: string;
  imageUrl?: string;
  notes?: string;
  quantity?: number;
  isPublic?: boolean;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await addShipCore(c.tenantId, c.membershipId, input);
  if (r.ok) revalidatePath("/fleet");
  return r;
}

export async function updateShipAction(
  shipId: string,
  patch: {
    shipName?: string;
    manufacturer?: string | null;
    imageUrl?: string | null;
    notes?: string | null;
    quantity?: number;
    isPublic?: boolean;
  },
) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await updateShipCore(c.tenantId, c.membershipId, shipId, patch);
  if (r.ok) revalidatePath("/fleet");
  return r;
}

export async function deleteShipAction(shipId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteShipCore(c.tenantId, c.membershipId, c.accountId, c.tier, shipId);
  if (r.ok) revalidatePath("/fleet");
  return r;
}
