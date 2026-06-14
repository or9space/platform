"use server";

import { revalidateTag } from "next/cache";
import { getSessionAccountId } from "../auth";
import {
  updateBrandingCore, updateLabelsCore, setFeatureFlagCore,
  upsertCustomFieldDefCore, deleteCustomFieldDefCore, updateIntegrationsCore,
} from "./tenant-config-core";

async function acct(): Promise<string | null> { return getSessionAccountId(); }
function bust(tenantId: string) { revalidateTag(`tenant-config:${tenantId}`); }

export async function updateBrandingAction(tenantId: string, input: { name?: string; tagline?: string | null; preset?: string }) {
  const a = await acct(); if (!a) return { ok: false as const, error: "Sign in required" };
  const r = await updateBrandingCore(tenantId, a, input as never); if (r.ok) bust(tenantId); return r;
}
export async function updateLabelsAction(tenantId: string, input: Record<string, string>) {
  const a = await acct(); if (!a) return { ok: false as const, error: "Sign in required" };
  const r = await updateLabelsCore(tenantId, a, input as never); if (r.ok) bust(tenantId); return r;
}
export async function setFeatureFlagAction(tenantId: string, key: string, enabled: boolean) {
  const a = await acct(); if (!a) return { ok: false as const, error: "Sign in required" };
  // plan is NOT a param — setFeatureFlagCore reads it from the tenant row to
  // prevent a client from spoofing plan="PAID" to unlock a paid-only flag.
  const r = await setFeatureFlagCore(tenantId, a, key, enabled); if (r.ok) bust(tenantId); return r;
}
export async function upsertCustomFieldDefAction(tenantId: string, typeName: string, input: { key: string; label: string; kind: string; enumValues?: string[]; required?: boolean }) {
  const a = await acct(); if (!a) return { ok: false as const, error: "Sign in required" };
  const r = await upsertCustomFieldDefCore(tenantId, a, typeName, input as never); if (r.ok) bust(tenantId); return r;
}
export async function deleteCustomFieldDefAction(tenantId: string, typeName: string, key: string) {
  const a = await acct(); if (!a) return { ok: false as const, error: "Sign in required" };
  const r = await deleteCustomFieldDefCore(tenantId, a, typeName, key); if (r.ok) bust(tenantId); return r;
}
export async function updateIntegrationsAction(tenantId: string, input: { discordGuildId?: string | null; discordBotToken?: string | null; calendarId?: string | null }) {
  const a = await acct(); if (!a) return { ok: false as const, error: "Sign in required" };
  const r = await updateIntegrationsCore(tenantId, a, input as never); if (r.ok) bust(tenantId); return r;
}
