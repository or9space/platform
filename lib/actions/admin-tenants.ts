"use server";

import { requirePlatformAdmin } from "../platform-admin";
import {
  provisionApprovedTenant,
  rejectPendingTenant,
  type ProvisionResult,
} from "../provisioning";

export async function approveTenantAction(pendingId: string): Promise<ProvisionResult> {
  await requirePlatformAdmin();
  return await provisionApprovedTenant(pendingId);
}

export async function rejectTenantAction(
  pendingId: string,
  reason: string,
): Promise<{ ok: boolean }> {
  await requirePlatformAdmin();
  return await rejectPendingTenant(pendingId, reason || "Not a fit for or9.space right now");
}
