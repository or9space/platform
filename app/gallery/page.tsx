import { notFound } from "next/navigation";
import { Image } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listGallery } from "@/lib/queries/gallery";
import { MfdPanel } from "@/components/ui/mfd";
import { GalleryUploadForm, DeleteGalleryButton } from "@/components/gallery/gallery-client";

export default async function GalleryPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();
  const isOfficer = hasTier(viewer.tier, "OFFICER");

  const items = await listGallery(makeTenantContext(ctx.tenant.id));

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Image className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gallery</h1>
          <p className="text-sm text-text-muted">Screenshots, artwork, and org media.</p>
        </div>
      </div>

      <MfdPanel chassis="primary" bodyPadding="md" title={<span>[ UPLOAD ]</span>}>
        <GalleryUploadForm />
      </MfdPanel>

      <MfdPanel
        chassis="neutral"
        bodyPadding="sm"
        title={<span>[ GALLERY ]</span>}
        titleAside={<span className="mfd-readout text-[10px]">{items.length}</span>}
      >
        {items.length === 0 ? (
          <p className="px-1 py-2 text-sm text-text-muted">No images yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((g) => (
              <figure key={g.id} className="relative overflow-hidden border border-border bg-surface-elevated">
                {(isOfficer || g.authorId === viewer.id) && <DeleteGalleryButton id={g.id} />}
                <img src={g.imageUrl} alt={g.title ?? g.caption ?? "Gallery image"} className="aspect-video w-full object-cover" />
                <figcaption className="p-2">
                  {g.title && <p className="text-sm font-medium text-text-primary">{g.title}</p>}
                  {g.caption && <p className="text-xs text-text-secondary">{g.caption}</p>}
                  <p className="mt-1 mfd-label">{g.authorName}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </MfdPanel>
    </div>
  );
}
