import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface GalleryRow {
  id: string;
  title: string | null;
  imageUrl: string;
  caption: string | null;
  authorId: string;
  authorName: string;
  authorUsername: string;
}

export async function listGallery(ctx: TenantContext): Promise<GalleryRow[]> {
  const rows = await db(ctx).galleryItem.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, imageUrl: true, caption: true, createdById: true,
      createdBy: { select: { displayName: true, username: true } },
    },
  });
  return rows.map((g) => ({
    id: g.id, title: g.title, imageUrl: g.imageUrl, caption: g.caption, authorId: g.createdById,
    authorName: g.createdBy?.displayName ?? g.createdBy?.username ?? "Unknown",
    authorUsername: g.createdBy?.username ?? "",
  }));
}
