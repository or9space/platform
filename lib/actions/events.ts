"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import {
  createEventCore,
  updateEventCore,
  deleteEventCore,
  rsvpEventCore,
  type EventInput,
} from "./events-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function createEventAction(input: EventInput) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createEventCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/events");
  return r;
}

export async function updateEventAction(eventId: string, input: EventInput) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await updateEventCore(c.tenantId, c.membershipId, c.tier, eventId, input);
  if (r.ok) {
    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);
  }
  return r;
}

export async function deleteEventAction(eventId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteEventCore(c.tenantId, c.membershipId, c.tier, eventId);
  if (r.ok) revalidatePath("/events");
  return r;
}

export async function rsvpEventAction(eventId: string, status: "GOING" | "MAYBE" | "NOT_GOING") {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await rsvpEventCore(c.tenantId, c.membershipId, { eventId, status });
  if (r.ok) revalidatePath(`/events/${eventId}`);
  return r;
}
