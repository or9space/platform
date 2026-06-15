"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import { updateProfileCore, type ProfileInput } from "./profile-core";

export async function updateProfileAction(input: ProfileInput) {
  const tenant = await getCurrentTenant();
  if (!tenant) return { ok: false as const, error: "Sign in required" };
  const accountId = await getSessionAccountId();
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return { ok: false as const, error: "Sign in required" };
  const r = await updateProfileCore(tenant.id, m.id, input);
  if (r.ok) {
    revalidatePath("/settings");
    revalidatePath(`/members/${m.username}`);
  }
  return r;
}
