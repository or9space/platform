"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import {
  createOperationCore, updateOperationCore, setOperationStatusCore, deleteOperationCore,
  signupOperationCore, withdrawOperationCore, type OperationInput,
} from "./operations-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function createOperationAction(input: OperationInput) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createOperationCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/operations");
  return r;
}

export async function updateOperationAction(operationId: string, input: OperationInput) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await updateOperationCore(c.tenantId, c.membershipId, c.tier, operationId, input);
  if (r.ok) { revalidatePath("/operations"); revalidatePath(`/operations/${operationId}`); }
  return r;
}

export async function setOperationStatusAction(operationId: string, status: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await setOperationStatusCore(c.tenantId, c.membershipId, c.tier, operationId, status);
  if (r.ok) { revalidatePath("/operations"); revalidatePath(`/operations/${operationId}`); }
  return r;
}

export async function deleteOperationAction(operationId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteOperationCore(c.tenantId, c.membershipId, c.tier, operationId);
  if (r.ok) revalidatePath("/operations");
  return r;
}

export async function signupOperationAction(operationId: string, role: string | null) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await signupOperationCore(c.tenantId, c.membershipId, { operationId, role });
  if (r.ok) revalidatePath(`/operations/${operationId}`);
  return r;
}

export async function withdrawOperationAction(operationId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await withdrawOperationCore(c.tenantId, c.membershipId, operationId);
  if (r.ok) revalidatePath(`/operations/${operationId}`);
  return r;
}
