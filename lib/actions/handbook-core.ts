import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";

type Result<T extends Record<string, unknown> = Record<string, unknown>> =
  ({ ok: true; error?: never } & T) | { ok: false; error: string };

// ---------------------------------------------------------------------------
// createHandbookCore — COMMAND+
// ---------------------------------------------------------------------------

const CreateSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9-]{1,59}$/),
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(300).optional(),
});

export async function createHandbookCore(
  tenantId: string,
  actorTier: RankTier,
  input: z.infer<typeof CreateSchema>,
): Promise<Result<{ handbookId: string }>> {
  if (!hasTier(actorTier, "COMMAND")) return { ok: false, error: "Requires COMMAND" };
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  const clash = await db(ctx).handbook.findFirst({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (clash) return { ok: false, error: "A handbook with that slug already exists" };
  const h = await db(ctx).handbook.create({
    data: { tenantId, slug: parsed.data.slug, title: parsed.data.title, subtitle: parsed.data.subtitle },
    select: { id: true },
  });
  return { ok: true, handbookId: h.id };
}

// ---------------------------------------------------------------------------
// upsertSectionCore — OFFICER+; bumps handbook.version
// ---------------------------------------------------------------------------

const SectionSchema = z.object({
  handbookId: z.string().min(1),
  sectionId: z.string().optional(),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(50000),
  orderIndex: z.number().int().min(0).max(1000),
});

export async function upsertSectionCore(
  tenantId: string,
  actorTier: RankTier,
  input: z.infer<typeof SectionSchema>,
): Promise<Result<{ sectionId: string }>> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const parsed = SectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  // Handbook must exist within this tenant (db(ctx) auto-scopes by tenantId)
  const hb = await db(ctx).handbook.findFirst({ where: { id: parsed.data.handbookId }, select: { id: true } });
  if (!hb) return { ok: false, error: "Handbook not found" };

  let sectionId: string;
  if (parsed.data.sectionId) {
    // Confirm the section belongs to this handbook+tenant
    const existing = await db(ctx).handbookSection.findFirst({
      where: { id: parsed.data.sectionId, handbookId: parsed.data.handbookId },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Section not found" };
    await db(ctx).handbookSection.update({
      where: { id: parsed.data.sectionId },
      data: { title: parsed.data.title, body: parsed.data.body, orderIndex: parsed.data.orderIndex },
    });
    sectionId = parsed.data.sectionId;
  } else {
    const s = await db(ctx).handbookSection.create({
      data: {
        tenantId,
        handbookId: parsed.data.handbookId,
        title: parsed.data.title,
        body: parsed.data.body,
        orderIndex: parsed.data.orderIndex,
      },
      select: { id: true },
    });
    sectionId = s.id;
  }
  await db(ctx).handbook.update({ where: { id: parsed.data.handbookId }, data: { version: { increment: 1 } } });
  return { ok: true, sectionId };
}

// ---------------------------------------------------------------------------
// deleteSectionCore — OFFICER+; bumps handbook.version
// ---------------------------------------------------------------------------

export async function deleteSectionCore(
  tenantId: string,
  actorTier: RankTier,
  sectionId: string,
): Promise<Result> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const ctx = makeTenantContext(tenantId);
  const s = await db(ctx).handbookSection.findFirst({
    where: { id: sectionId },
    select: { id: true, handbookId: true },
  });
  if (!s) return { ok: false, error: "Section not found" };
  await db(ctx).handbookSection.delete({ where: { id: sectionId } });
  await db(ctx).handbook.update({ where: { id: s.handbookId }, data: { version: { increment: 1 } } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// setHandbookStatusCore — COMMAND+
// ---------------------------------------------------------------------------

const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export async function setHandbookStatusCore(
  tenantId: string,
  actorTier: RankTier,
  handbookId: string,
  status: (typeof STATUSES)[number],
): Promise<Result> {
  if (!hasTier(actorTier, "COMMAND")) return { ok: false, error: "Requires COMMAND" };
  if (!STATUSES.includes(status)) return { ok: false, error: "Invalid status" };
  const ctx = makeTenantContext(tenantId);
  const hb = await db(ctx).handbook.findFirst({ where: { id: handbookId }, select: { id: true } });
  if (!hb) return { ok: false, error: "Handbook not found" };
  await db(ctx).handbook.update({ where: { id: handbookId }, data: { status } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// acknowledgeHandbookCore — any member; PUBLISHED only; upserts versionRead
// ---------------------------------------------------------------------------

export async function acknowledgeHandbookCore(
  tenantId: string,
  membershipId: string,
  handbookId: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  const hb = await db(ctx).handbook.findFirst({
    where: { id: handbookId },
    select: { id: true, version: true, status: true },
  });
  if (!hb) return { ok: false, error: "Handbook not found" };
  if (hb.status !== "PUBLISHED") return { ok: false, error: "Only published handbooks can be acknowledged" };
  await db(ctx).handbookAcknowledgement.upsert({
    where: { handbookId_membershipId: { handbookId, membershipId } } as never,
    create: { tenantId, handbookId, membershipId, versionRead: hb.version },
    update: { versionRead: hb.version, acknowledgedAt: new Date() },
  });
  return { ok: true };
}
