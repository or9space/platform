import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { writeAudit } from "../audit";

type Result<T extends Record<string, unknown> = Record<string, unknown>> =
  ({ ok: true; error?: never } & T) | { ok: false; error: string };

const urlRefine = (u: string) => u.startsWith("http://") || u.startsWith("https://");

const AddSchema = z.object({
  shipName: z.string().trim().min(1).max(160),
  manufacturer: z.string().trim().max(120).optional(),
  imageUrl: z.string().trim().url().max(500).refine(urlRefine, "Must be an http(s) URL").optional(),
  notes: z.string().trim().max(500).optional(),
  quantity: z.number().int().positive().max(10000).optional(),
  isPublic: z.boolean().optional(),
});

export async function addShipCore(
  tenantId: string,
  actorMembershipId: string,
  input: z.infer<typeof AddSchema>,
): Promise<Result<{ shipId: string }>> {
  const parsed = AddSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  const s = await db(ctx).fleetShip.create({
    data: {
      tenantId,
      ownerMembershipId: actorMembershipId, // SECURITY: owner = actor, never from input
      shipName: parsed.data.shipName,
      manufacturer: parsed.data.manufacturer,
      imageUrl: parsed.data.imageUrl,
      notes: parsed.data.notes,
      quantity: parsed.data.quantity ?? 1,
      isPublic: parsed.data.isPublic ?? true,
    },
    select: { id: true },
  });
  return { ok: true, shipId: s.id };
}

const UpdateSchema = z.object({
  shipName: z.string().trim().min(1).max(160).optional(),
  manufacturer: z.string().trim().max(120).nullable().optional(),
  imageUrl: z.string().trim().url().max(500).refine(urlRefine, "Must be an http(s) URL").nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  quantity: z.number().int().positive().max(10000).optional(),
  isPublic: z.boolean().optional(),
});

export async function updateShipCore(
  tenantId: string,
  actorMembershipId: string,
  shipId: string,
  input: z.infer<typeof UpdateSchema>,
): Promise<Result> {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  // SECURITY: owner-bound — only the owner can edit their ship.
  // db(ctx) injects tenantId into the where clause, so a shipId from another
  // tenant yields null here (cross-tenant isolation enforced by proxy).
  const ship = await db(ctx).fleetShip.findFirst({
    where: { id: shipId, ownerMembershipId: actorMembershipId },
    select: { id: true },
  });
  if (!ship) return { ok: false, error: "Ship not found or not yours" };
  await db(ctx).fleetShip.update({ where: { id: shipId }, data: parsed.data });
  return { ok: true };
}

export async function deleteShipCore(
  tenantId: string,
  actorMembershipId: string,
  actorAccountId: string,
  actorTier: RankTier,
  shipId: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  // db(ctx) injects tenantId into where, so a shipId from another tenant
  // yields null here — cross-tenant delete is rejected at the data layer.
  const ship = await db(ctx).fleetShip.findFirst({
    where: { id: shipId },
    select: { id: true, ownerMembershipId: true, shipName: true },
  });
  if (!ship) return { ok: false, error: "Ship not found" };
  const isOwner = ship.ownerMembershipId === actorMembershipId;
  if (!isOwner && !hasTier(actorTier, "COMMAND")) return { ok: false, error: "Not your ship" };
  await db(ctx).fleetShip.delete({ where: { id: shipId } });
  if (!isOwner) {
    await writeAudit(ctx, actorAccountId, "fleet.ship.moderate_delete", {
      shipId,
      shipName: ship.shipName,
      ownerMembershipId: ship.ownerMembershipId,
    });
  }
  return { ok: true };
}
