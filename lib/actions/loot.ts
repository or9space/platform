"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import {
  createLootMemberCore,
  createSessionCore,
  setAttendanceCore,
  spendLootCore,
  adjustLootCore,
  transferLootCore,
} from "./loot-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, accountId, membershipId: m.id, tier: m.tier };
}

export async function createLootMemberAction(input: {
  displayName: string;
  membershipId?: string;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createLootMemberCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/loot");
  return r;
}

export async function createSessionAction(input: {
  label: string;
  sessionDate: string;
  notes?: string;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createSessionCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/loot/sessions");
  return r;
}

export async function setAttendanceAction(input: {
  sessionId: string;
  memberId: string;
  status: "PRESENT" | "LATE" | "ABSENT";
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await setAttendanceCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) {
    revalidatePath("/loot");
    revalidatePath("/loot/sessions");
  }
  return r;
}

export async function spendLootAction(input: {
  memberId: string;
  amountTenths: number;
  note?: string;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await spendLootCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) {
    revalidatePath("/loot");
    revalidatePath("/loot/pile");
  }
  return r;
}

export async function adjustLootAction(input: {
  memberId: string;
  amountTenths: number;
  note?: string;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await adjustLootCore(c.tenantId, c.membershipId, c.accountId, c.tier, input);
  if (r.ok) revalidatePath("/loot");
  return r;
}

export async function transferLootAction(input: {
  toMemberId: string;
  amountTenths: number;
  note?: string;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  // Resolve the sender's own LootMember from their membership.
  // The core enforces membershipId===actor on the fromMemberId row, so we
  // look up by membershipId here to surface a friendlier error before the tx.
  const mine = await db(makeTenantContext(c.tenantId)).lootMember.findFirst({
    where: { membershipId: c.membershipId },
    select: { id: true },
  });
  if (!mine) return { ok: false as const, error: "You are not a loot participant" };
  const r = await transferLootCore(c.tenantId, c.membershipId, mine.id, input);
  if (r.ok) revalidatePath("/loot");
  return r;
}
