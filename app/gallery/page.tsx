import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listGallery } from "@/lib/queries/gallery";
import { GalleryUploadForm, DeleteGalleryButton } from "@/components/gallery/gallery-client";

export default async function GalleryPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const isOfficer = hasTier(viewer.tier, "OFFICER");

  const items = await listGallery(makeTenantContext(ctx.tenant.id));

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Gallery</h1>
      <GalleryUploadForm />

      {items.length === 0 ? (
        <p className="text-sm text-text-muted">No images yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((g) => (
            <figure key={g.id} className="relative overflow-hidden rounded border border-border">
              {(isOfficer || g.authorId === viewer.id) && <DeleteGalleryButton id={g.id} />}
              <img src={g.imageUrl} alt={g.title ?? g.caption ?? "Gallery image"} className="aspect-video w-full object-cover" />
              <figcaption className="p-2">
                {g.title && <p className="text-sm font-medium text-text-primary">{g.title}</p>}
                {g.caption && <p className="text-xs text-text-secondary">{g.caption}</p>}
                <p className="mt-1 text-xs text-text-muted">{g.authorName}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </main>
  );
}
