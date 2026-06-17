import { notFound } from "next/navigation";
import { Image } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader icon={Image} title="Gallery" subtitle="Screenshots, artwork, and org media." />

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
                <a href={`/gallery/${g.id}`} className="block">
                  <img src={g.imageUrl} alt={g.title ?? g.caption ?? "Gallery image"} className="aspect-video w-full object-cover hover:opacity-90 transition-opacity" />
                </a>
                <figcaption className="p-2">
                  {g.title && (
                    <a href={`/gallery/${g.id}`} className="hover:text-primary transition-colors">
                      <p className="text-sm font-medium text-text-primary">{g.title}</p>
                    </a>
                  )}
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
