"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import { updateOwnProfileCore, setMemberTierCore } from "./members-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, accountId, membershipId: m.id, tier: m.tier };
}

export async function updateOwnProfileAction(input: { displayName?: string; bio?: string; avatarUrl?: string }) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  // SECURITY: edits the viewer's OWN membership — id + accountId both from the session, never the client.
  const r = await updateOwnProfileCore(c.tenantId, c.accountId, c.membershipId, input);
  if (r.ok) revalidatePath("/members");
  return r;
}

export async function setMemberTierAction(
  targetMembershipId: string,
  newTier: "ENLISTED" | "NCO" | "OFFICER" | "COMMAND",
) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  // SECURITY: the core re-derives the actor's tier from the DB via accountId — the client cannot influence the privilege check.
  const r = await setMemberTierCore(c.tenantId, c.accountId, targetMembershipId, newTier);
  if (r.ok) revalidatePath("/admin/members");
  return r;
}
