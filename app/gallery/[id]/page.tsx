import { notFound } from "next/navigation";
import { Image, ArrowLeft, Calendar, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MfdPanel } from "@/components/ui/mfd";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { getGalleryItem } from "@/lib/queries/gallery";
import { listComments } from "@/lib/queries/comments";
import { hasTier } from "@/lib/permissions";
import { Comments } from "@/components/comments/comments";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ctx = await getFullTenantContext();
  if (!ctx) notFound();

  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();

  const tenantCtx = makeTenantContext(ctx.tenant.id);
  const [item, comments] = await Promise.all([
    getGalleryItem(tenantCtx, id),
    listComments(tenantCtx, "GALLERY", id),
  ]);
  if (!item) notFound();
  const canModerate = hasTier(viewer.tier, "OFFICER");

  const formattedDate = item.createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <a
        href="/gallery"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Gallery
      </a>

      <PageHeader
        icon={Image}
        title={item.title ?? "Gallery Image"}
        subtitle={item.caption ?? undefined}
      />

      <MfdPanel chassis="neutral" bodyPadding="none" title={<span>[ IMAGE ]</span>}>
        <div className="overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.title ?? item.caption ?? "Gallery image"}
            className="w-full object-contain max-h-[70vh] bg-black/40"
          />
        </div>
      </MfdPanel>

      <MfdPanel chassis="primary" bodyPadding="md" title={<span>[ DETAILS ]</span>}>
        <dl className="space-y-3 text-sm">
          {item.title && (
            <div>
              <dt className="mfd-label mb-0.5">Title</dt>
              <dd className="text-text-primary font-medium">{item.title}</dd>
            </div>
          )}
          {item.caption && (
            <div>
              <dt className="mfd-label mb-0.5">Caption</dt>
              <dd className="text-text-secondary">{item.caption}</dd>
            </div>
          )}
          <div className="flex flex-wrap gap-6 pt-1">
            <div className="flex items-center gap-1.5 text-text-muted">
              <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="mfd-label">Author</span>
              <span className="ml-1 text-text-secondary">{item.authorName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-muted">
              <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="mfd-label">Date</span>
              <span className="ml-1 text-text-secondary">{formattedDate}</span>
            </div>
          </div>
        </dl>
      </MfdPanel>

      <Comments
        entityType="GALLERY"
        entityId={item.id}
        path={`/gallery/${item.id}`}
        comments={comments}
        viewerMembershipId={viewer.id}
        canModerate={canModerate}
      />
    </div>
  );
}
