import { prismaGlobal } from "../db";

export interface PublicOrg {
  slug: string;
  name: string;
  tagline: string | null;
}

export async function listPublicOrgs(): Promise<PublicOrg[]> {
  return prismaGlobal.tenant.findMany({
    where: { isListed: true, status: "LIVE" },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, tagline: true },
  });
}
