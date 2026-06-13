import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface HandbookRow { id: string; slug: string; title: string; subtitle: string | null; version: number; status: string; }
export async function listHandbooks(ctx: TenantContext, opts?: { publishedOnly?: boolean }): Promise<HandbookRow[]> {
  return db(ctx).handbook.findMany({
    where: opts?.publishedOnly ? { status: "PUBLISHED" } : undefined,
    orderBy: { title: "asc" },
    select: { id: true, slug: true, title: true, subtitle: true, version: true, status: true },
  }) as Promise<HandbookRow[]>;
}

export interface SectionRow { id: string; title: string; body: string; orderIndex: number; }
export interface HandbookDetail extends HandbookRow { sections: SectionRow[]; }
export async function getHandbookBySlug(ctx: TenantContext, slug: string): Promise<HandbookDetail | null> {
  const h = await db(ctx).handbook.findFirst({
    where: { slug },
    select: {
      id: true, slug: true, title: true, subtitle: true, version: true, status: true,
      sections: { orderBy: { orderIndex: "asc" }, select: { id: true, title: true, body: true, orderIndex: true } },
    },
  });
  return h as HandbookDetail | null;
}

export interface ViewerAck { versionRead: number; isStale: boolean; }
export async function getViewerAck(ctx: TenantContext, handbookId: string, membershipId: string): Promise<ViewerAck | null> {
  const [ack, hb] = await Promise.all([
    db(ctx).handbookAcknowledgement.findFirst({ where: { handbookId, membershipId }, select: { versionRead: true } }),
    db(ctx).handbook.findFirst({ where: { id: handbookId }, select: { version: true } }),
  ]);
  if (!ack || !hb) return null;
  return { versionRead: ack.versionRead, isStale: ack.versionRead < hb.version };
}
