import { headers } from "next/headers";
import { prismaGlobal } from "../db";

export async function getCurrentTenant() {
  const h = await headers();
  const slug = h.get("x-or9-tenant");
  if (!slug) return null;
  return await prismaGlobal.tenant.findUnique({ where: { slug } });
}
