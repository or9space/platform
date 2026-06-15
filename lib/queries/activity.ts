import { db } from "../db";
import type { TenantContext } from "../tenant";
import { isFeatureEnabled, type FeatureMap } from "../features";

export interface ActivityEntry {
  kind: string;
  title: string;
  href: string;
  when: Date;
  who: string | null;
}

const name = (m: { displayName: string | null; username: string } | null) =>
  m?.displayName ?? m?.username ?? null;

/**
 * A unified recent-activity timeline computed from whatever modules the tenant
 * has enabled. No audit table — this merges the newest rows across content
 * tables, so it reflects real activity without an extra write path.
 */
export async function getActivityFeed(
  ctx: TenantContext, features: FeatureMap, limit = 30,
): Promise<ActivityEntry[]> {
  const out: ActivityEntry[] = [];
  const per = 10;

  if (isFeatureEnabled(features, "news")) {
    const rows = await db(ctx).newsPost.findMany({
      orderBy: { createdAt: "desc" }, take: per,
      select: { id: true, title: true, createdAt: true, author: { select: { displayName: true, username: true } } },
    });
    for (const r of rows) out.push({ kind: "News", title: r.title, href: `/news/${r.id}`, when: r.createdAt, who: name(r.author) });
  }
  if (isFeatureEnabled(features, "events")) {
    const rows = await db(ctx).event.findMany({
      orderBy: { createdAt: "desc" }, take: per,
      select: { id: true, title: true, createdAt: true, createdBy: { select: { displayName: true, username: true } } },
    });
    for (const r of rows) out.push({ kind: "Event", title: r.title, href: `/events/${r.id}`, when: r.createdAt, who: name(r.createdBy) });
  }
  if (isFeatureEnabled(features, "operations")) {
    const rows = await db(ctx).operation.findMany({
      orderBy: { createdAt: "desc" }, take: per,
      select: { id: true, title: true, createdAt: true, createdBy: { select: { displayName: true, username: true } } },
    });
    for (const r of rows) out.push({ kind: "Operation", title: r.title, href: `/operations/${r.id}`, when: r.createdAt, who: name(r.createdBy) });
  }
  if (isFeatureEnabled(features, "contracts")) {
    const rows = await db(ctx).contract.findMany({
      orderBy: { createdAt: "desc" }, take: per,
      select: { id: true, title: true, createdAt: true, createdBy: { select: { displayName: true, username: true } } },
    });
    for (const r of rows) out.push({ kind: "Contract", title: r.title, href: `/contracts`, when: r.createdAt, who: name(r.createdBy) });
  }
  if (isFeatureEnabled(features, "forums")) {
    const rows = await db(ctx).forumThread.findMany({
      orderBy: { createdAt: "desc" }, take: per,
      select: { id: true, title: true, createdAt: true, category: { select: { slug: true } }, author: { select: { displayName: true, username: true } } },
    });
    for (const r of rows) out.push({ kind: "Thread", title: r.title, href: `/forums/${r.category?.slug}/${r.id}`, when: r.createdAt, who: name(r.author) });
  }
  if (isFeatureEnabled(features, "gallery")) {
    const rows = await db(ctx).galleryItem.findMany({
      orderBy: { createdAt: "desc" }, take: per,
      select: { id: true, title: true, createdAt: true, createdBy: { select: { displayName: true, username: true } } },
    });
    for (const r of rows) out.push({ kind: "Image", title: r.title ?? "New image", href: `/gallery`, when: r.createdAt, who: name(r.createdBy) });
  }

  return out.sort((a, b) => b.when.getTime() - a.when.getTime()).slice(0, limit);
}
