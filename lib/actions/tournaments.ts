"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import {
  createTournamentCore,
  updateTournamentCore,
  setTournamentStatusCore,
  deleteTournamentCore,
  addEntryCore,
  removeEntryCore,
  recordPlacementCore,
} from "./tournaments-core";

type TStatus = "DRAFT" | "OPEN" | "IN_PROGRESS" | "COMPLETE";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, accountId, membershipId: m.id, tier: m.tier, name: m.displayName ?? m.username };
}

export async function createTournamentAction(input: { name: string; description?: string; format?: string; startsAt?: string }) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createTournamentCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/tournaments");
  return r;
}

export async function updateTournamentAction(id: string, patch: { name?: string; description?: string; format?: string; startsAt?: string }) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await updateTournamentCore(c.tenantId, c.membershipId, c.tier, id, patch);
  if (r.ok) revalidatePath("/tournaments");
  return r;
}

export async function setTournamentStatusAction(id: string, status: TStatus) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await setTournamentStatusCore(c.tenantId, c.membershipId, c.tier, id, status);
  if (r.ok) revalidatePath("/tournaments");
  return r;
}

export async function deleteTournamentAction(id: string) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteTournamentCore(c.tenantId, c.membershipId, c.accountId, c.tier, id);
  if (r.ok) revalidatePath("/tournaments");
  return r;
}

export async function registerSelfAction(tournamentId: string) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await addEntryCore(c.tenantId, c.membershipId, c.tier, { tournamentId, displayName: c.name });
  if (r.ok) revalidatePath("/tournaments");
  return r;
}

export async function addOfficerEntryAction(tournamentId: string, displayName: string, participantMembershipId?: string) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await addEntryCore(c.tenantId, c.membershipId, c.tier, { tournamentId, displayName, participantMembershipId, asOfficer: true });
  if (r.ok) revalidatePath("/tournaments");
  return r;
}

export async function removeEntryAction(entryId: string) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await removeEntryCore(c.tenantId, c.membershipId, c.tier, entryId);
  if (r.ok) revalidatePath("/tournaments");
  return r;
}

export async function recordPlacementAction(entryId: string, placement: number) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await recordPlacementCore(c.tenantId, c.membershipId, c.tier, entryId, placement);
  if (r.ok) revalidatePath("/tournaments");
  return r;
}
