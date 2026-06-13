"use server";

import { getSessionAccountId } from "../auth";
import { startUpgradeCore } from "./billing-core";

export async function startUpgradeAction(tenantId: string, priceId: string) {
  const a = await getSessionAccountId();
  if (!a) return { ok: false as const, error: "Sign in required" };
  return startUpgradeCore(tenantId, a, priceId);
}
