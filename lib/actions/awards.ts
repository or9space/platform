"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import {
  createAwardCore, deleteAwardCore, grantAwardCore, revokeAwardCore,
  nominateAwardCore, resolveNominationCore,
  type AwardInput,
} from "./awards-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function createAwardAction(input: AwardInput) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createAwardCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/awards");
  return r;
}

export async function deleteAwardAction(id: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteAwardCore(c.tenantId, c.membershipId, c.tier, id);
  if (r.ok) revalidatePath("/awards");
  return r;
}

export async function grantAwardAction(input: { awardId: string; username: string; note: string | null }) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await grantAwardCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/awards");
  return r;
}

export async function revokeAwardAction(awardId: string, recipientMembershipId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await revokeAwardCore(c.tenantId, c.membershipId, c.tier, awardId, recipientMembershipId);
  if (r.ok) revalidatePath("/awards");
  return r;
}

export async function nominateAwardAction(input: { awardId: string; nomineeUsername: string; reason: string }) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await nominateAwardCore(c.tenantId, c.membershipId, input);
  if (r.ok) revalidatePath("/awards");
  return r;
}

export async function resolveNominationAction(nominationId: string, approve: boolean) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await resolveNominationCore(c.tenantId, c.membershipId, c.tier, nominationId, approve);
  if (r.ok) revalidatePath("/awards");
  return r;
}
