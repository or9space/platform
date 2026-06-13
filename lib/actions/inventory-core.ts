import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { writeAudit } from "../audit";
import { INVENTORY_CATEGORIES, INVENTORY_KINDS, HOLDING_STATES } from "../inventory";

type Result<T extends Record<string, unknown> = Record<string, unknown>> =
  ({ ok: true; error?: never } & T) | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Item schemas
// ---------------------------------------------------------------------------

const ItemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.enum(INVENTORY_CATEGORIES),
  kind: z.enum(INVENTORY_KINDS),
  description: z.string().trim().max(1000).optional(),
});

const ItemPatchSchema = ItemSchema.partial();

// ---------------------------------------------------------------------------
// Item write actions
// ---------------------------------------------------------------------------

export async function createItemCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  input: z.infer<typeof ItemSchema>,
): Promise<Result<{ itemId: string }>> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const parsed = ItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  const it = await db(ctx).inventoryItem.create({
    data: { tenantId, ...parsed.data },
    select: { id: true },
  });
  return { ok: true, itemId: it.id };
}

export async function updateItemCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  itemId: string,
  input: z.infer<typeof ItemPatchSchema>,
): Promise<Result> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const parsed = ItemPatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  const it = await db(ctx).inventoryItem.findFirst({ where: { id: itemId }, select: { id: true } });
  if (!it) return { ok: false, error: "Item not found" };
  await db(ctx).inventoryItem.update({ where: { id: itemId }, data: parsed.data });
  return { ok: true };
}

export async function deleteItemCore(
  tenantId: string,
  actorMembershipId: string,
  actorAccountId: string,
  actorTier: RankTier,
  itemId: string,
): Promise<Result> {
  if (!hasTier(actorTier, "COMMAND")) return { ok: false, error: "Requires COMMAND" };
  const ctx = makeTenantContext(tenantId);
  const it = await db(ctx).inventoryItem.findFirst({
    where: { id: itemId },
    select: { id: true, name: true },
  });
  if (!it) return { ok: false, error: "Item not found" };
  await db(ctx).inventoryItem.delete({ where: { id: itemId } });
  await writeAudit(ctx, actorAccountId, "inventory.item.delete", { itemId, name: it.name });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Holding schemas
// ---------------------------------------------------------------------------

const HoldingSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive().max(1_000_000),
  custodianMembershipId: z.string().optional(),
  state: z.enum(HOLDING_STATES).optional(),
  notes: z.string().trim().max(500).optional(),
});

const HoldingPatchSchema = z.object({
  quantity: z.number().int().positive().max(1_000_000).optional(),
  custodianMembershipId: z.string().nullable().optional(),
  state: z.enum(HOLDING_STATES).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Holding helpers
// ---------------------------------------------------------------------------

async function custodianInTenant(
  ctx: ReturnType<typeof makeTenantContext>,
  custodianMembershipId: string,
): Promise<boolean> {
  const m = await db(ctx).membership.findFirst({
    where: { id: custodianMembershipId },
    select: { id: true },
  });
  return !!m;
}

// ---------------------------------------------------------------------------
// Holding write actions
// ---------------------------------------------------------------------------

export async function createHoldingCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  input: z.infer<typeof HoldingSchema>,
): Promise<Result<{ holdingId: string }>> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const parsed = HoldingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  const item = await db(ctx).inventoryItem.findFirst({
    where: { id: parsed.data.itemId },
    select: { id: true },
  });
  if (!item) return { ok: false, error: "Item not found" };
  if (
    parsed.data.custodianMembershipId &&
    !(await custodianInTenant(ctx, parsed.data.custodianMembershipId))
  ) {
    return { ok: false, error: "Custodian is not a member of this org" };
  }
  const h = await db(ctx).inventoryHolding.create({
    data: {
      tenantId,
      itemId: parsed.data.itemId,
      quantity: parsed.data.quantity,
      custodianMembershipId: parsed.data.custodianMembershipId,
      state: parsed.data.state ?? "ACTIVE",
      notes: parsed.data.notes,
    },
    select: { id: true },
  });
  return { ok: true, holdingId: h.id };
}

export async function updateHoldingCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  holdingId: string,
  input: z.infer<typeof HoldingPatchSchema>,
): Promise<Result> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const parsed = HoldingPatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  const h = await db(ctx).inventoryHolding.findFirst({
    where: { id: holdingId },
    select: { id: true },
  });
  if (!h) return { ok: false, error: "Holding not found" };
  if (
    parsed.data.custodianMembershipId &&
    !(await custodianInTenant(ctx, parsed.data.custodianMembershipId))
  ) {
    return { ok: false, error: "Custodian is not a member of this org" };
  }
  await db(ctx).inventoryHolding.update({ where: { id: holdingId }, data: parsed.data });
  return { ok: true };
}

export async function deleteHoldingCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  holdingId: string,
): Promise<Result> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const ctx = makeTenantContext(tenantId);
  const h = await db(ctx).inventoryHolding.findFirst({
    where: { id: holdingId },
    select: { id: true },
  });
  if (!h) return { ok: false, error: "Holding not found" };
  await db(ctx).inventoryHolding.delete({ where: { id: holdingId } });
  return { ok: true };
}
