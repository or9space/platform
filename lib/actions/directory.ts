"use server";

import { revalidatePath } from "next/cache";
import { getSessionAccountId } from "../auth";
import { setDirectoryListingCore } from "./directory-core";

export async function setDirectoryListingAction(
  tenantId: string,
  input: { isListed: boolean; tagline?: string | null },
) {
  const a = await getSessionAccountId();
  if (!a) return { ok: false as const, error: "Sign in required" };
  const r = await setDirectoryListingCore(tenantId, a, input);
  if (r.ok) {
    revalidatePath("/admin/directory");
    revalidatePath("/orgs");
  }
  return r;
}
