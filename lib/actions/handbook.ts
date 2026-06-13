"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import {
  createHandbookCore,
  upsertSectionCore,
  deleteSectionCore,
  setHandbookStatusCore,
  acknowledgeHandbookCore,
} from "./handbook-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function createHandbookAction(input: {
  slug: string;
  title: string;
  subtitle?: string;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createHandbookCore(c.tenantId, c.tier, input);
  if (r.ok) revalidatePath("/handbook");
  return r;
}

export async function upsertSectionAction(input: {
  handbookId: string;
  sectionId?: string;
  title: string;
  body: string;
  orderIndex: number;
}) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await upsertSectionCore(c.tenantId, c.tier, input);
  if (r.ok) revalidatePath("/handbook");
  return r;
}

export async function deleteSectionAction(sectionId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteSectionCore(c.tenantId, c.tier, sectionId);
  if (r.ok) revalidatePath("/handbook");
  return r;
}

export async function setHandbookStatusAction(
  handbookId: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await setHandbookStatusCore(c.tenantId, c.tier, handbookId, status);
  if (r.ok) revalidatePath("/handbook");
  return r;
}

export async function acknowledgeHandbookAction(handbookId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await acknowledgeHandbookCore(c.tenantId, c.membershipId, handbookId);
  if (r.ok) revalidatePath("/handbook");
  return r;
}
