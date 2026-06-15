"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import {
  createContractCore, deleteContractCore, setContractStatusCore,
  claimContractCore, unclaimContractCore, type ContractInput,
} from "./contracts-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function createContractAction(input: ContractInput) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createContractCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/contracts");
  return r;
}
export async function deleteContractAction(id: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteContractCore(c.tenantId, c.membershipId, c.tier, id);
  if (r.ok) revalidatePath("/contracts");
  return r;
}
export async function setContractStatusAction(id: string, status: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await setContractStatusCore(c.tenantId, c.membershipId, c.tier, id, status);
  if (r.ok) revalidatePath("/contracts");
  return r;
}
export async function claimContractAction(id: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await claimContractCore(c.tenantId, c.membershipId, id);
  if (r.ok) revalidatePath("/contracts");
  return r;
}
export async function unclaimContractAction(id: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await unclaimContractCore(c.tenantId, c.membershipId, c.tier, id);
  if (r.ok) revalidatePath("/contracts");
  return r;
}
