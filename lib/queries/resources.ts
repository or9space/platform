import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface ResourceRow {
  id: string;
  title: string;
  url: string | null;
  body: string | null;
  category: string | null;
  authorName: string;
  createdAt: Date;
}

export async function listResources(ctx: TenantContext): Promise<ResourceRow[]> {
  const rows = await db(ctx).resource.findMany({
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, url: true, body: true, category: true, createdAt: true,
      createdBy: { select: { displayName: true, username: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id, title: r.title, url: r.url, body: r.body, category: r.category, createdAt: r.createdAt,
    authorName: r.createdBy?.displayName ?? r.createdBy?.username ?? "Unknown",
  }));
}
