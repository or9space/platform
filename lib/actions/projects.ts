"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import {
  createProjectCore, deleteProjectCore, createTicketCore,
  setTicketStatusCore, assignTicketCore, deleteTicketCore, type ProjectInput,
} from "./projects-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, membershipId: m.id, tier: m.tier };
}

export async function createProjectAction(input: ProjectInput) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createProjectCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/projects");
  return r;
}
export async function deleteProjectAction(id: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteProjectCore(c.tenantId, c.membershipId, c.tier, id);
  if (r.ok) revalidatePath("/projects");
  return r;
}
export async function createTicketAction(input: { projectId: string; title: string; description: string | null }) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createTicketCore(c.tenantId, c.membershipId, input);
  if (r.ok) revalidatePath(`/projects/${input.projectId}`);
  return r;
}
export async function setTicketStatusAction(projectId: string, ticketId: string, status: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await setTicketStatusCore(c.tenantId, c.membershipId, ticketId, status);
  if (r.ok) revalidatePath(`/projects/${projectId}`);
  return r;
}
export async function assignTicketAction(projectId: string, ticketId: string, username: string | null) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await assignTicketCore(c.tenantId, c.membershipId, ticketId, username);
  if (r.ok) revalidatePath(`/projects/${projectId}`);
  return r;
}
export async function deleteTicketAction(projectId: string, ticketId: string) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteTicketCore(c.tenantId, c.membershipId, c.tier, ticketId);
  if (r.ok) revalidatePath(`/projects/${projectId}`);
  return r;
}
