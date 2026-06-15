import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface AllianceRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  link: string | null;
}

export async function listAlliances(ctx: TenantContext): Promise<AllianceRow[]> {
  const rows = await db(ctx).alliance.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: { id: true, name: true, description: true, status: true, link: true },
  });
  return rows;
}
