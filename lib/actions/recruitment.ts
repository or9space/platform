"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import {
  submitApplicationCore, rejectApplicationCore, approveApplicationCore, type ApplyInput,
} from "./recruitment-core";

/** PUBLIC: anyone visiting the org can apply. Tenant resolved from the host. */
export async function submitApplicationAction(input: ApplyInput) {
  const tenant = await getCurrentTenant();
  if (!tenant || tenant.status !== "LIVE") return { ok: false as const, error: "Org not found" };
  return submitApplicationCore(tenant.id, input);
}

async function officerCtx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function approveApplicationAction(applicationId: string) {
  const c = await officerCtx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await approveApplicationCore(c.tenantId, c.membershipId, c.tier, applicationId);
  if (r.ok) revalidatePath("/recruitment");
  return r;
}

export async function rejectApplicationAction(applicationId: string, note: string | null) {
  const c = await officerCtx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await rejectApplicationCore(c.tenantId, c.membershipId, c.tier, applicationId, note);
  if (r.ok) revalidatePath("/recruitment");
  return r;
}
