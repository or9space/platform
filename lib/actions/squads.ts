"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import {
  createSquadCore, deleteSquadCore, addSquadMemberCore, removeSquadMemberCore, type SquadInput,
} from "./squads-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function createSquadAction(input: SquadInput) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createSquadCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/squads");
  return r;
}
export async function deleteSquadAction(id: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteSquadCore(c.tenantId, c.membershipId, c.tier, id);
  if (r.ok) revalidatePath("/squads");
  return r;
}
export async function addSquadMemberAction(input: { squadId: string; username: string; role: string | null }) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await addSquadMemberCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/squads");
  return r;
}
export async function removeSquadMemberAction(squadId: string, memberMembershipId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await removeSquadMemberCore(c.tenantId, c.membershipId, c.tier, squadId, memberMembershipId);
  if (r.ok) revalidatePath("/squads");
  return r;
}
