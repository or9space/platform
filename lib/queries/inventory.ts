import { db } from "../db";
import type { TenantContext } from "../tenant";
import type { InventoryCategory, InventoryKind, HoldingState } from "../inventory";

export interface ItemRow {
  id: string;
  name: string;
  category: InventoryCategory;
  kind: InventoryKind;
  description: string | null;
}

export async function listItems(ctx: TenantContext, search?: string): Promise<ItemRow[]> {
  const q = search?.trim();
  return db(ctx).inventoryItem.findMany({
    where: q && q.length >= 1 ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    select: { id: true, name: true, category: true, kind: true, description: true },
  }) as Promise<ItemRow[]>;
}

export async function getItem(ctx: TenantContext, itemId: string): Promise<ItemRow | null> {
  return db(ctx).inventoryItem.findFirst({
    where: { id: itemId },
    select: { id: true, name: true, category: true, kind: true, description: true },
  }) as Promise<ItemRow | null>;
}

export interface HoldingRow {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  state: HoldingState;
  notes: string | null;
  custodianName: string | null;
}

function mapHolding(h: {
  id: string;
  itemId: string;
  quantity: number;
  state: string;
  notes: string | null;
  item: { name: string } | null;
  custodian: { displayName: string; username: string } | null;
}): HoldingRow {
  return {
    id: h.id,
    itemId: h.itemId,
    itemName: h.item?.name ?? "Unknown",
    quantity: h.quantity,
    state: h.state as HoldingState,
    notes: h.notes,
    custodianName: h.custodian?.displayName ?? h.custodian?.username ?? null,
  };
}

const HOLDING_SELECT = {
  id: true,
  itemId: true,
  quantity: true,
  state: true,
  notes: true,
  item: { select: { name: true } },
  custodian: { select: { displayName: true, username: true } },
} as const;

export async function listHoldings(
  ctx: TenantContext,
  filter?: { itemId?: string; state?: HoldingState },
): Promise<HoldingRow[]> {
  const rows = await db(ctx).inventoryHolding.findMany({
    where: { itemId: filter?.itemId, state: filter?.state },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: HOLDING_SELECT,
  });
  return (rows as Parameters<typeof mapHolding>[0][]).map(mapHolding);
}

export async function listHoldingsByItem(ctx: TenantContext, itemId: string): Promise<HoldingRow[]> {
  const rows = await db(ctx).inventoryHolding.findMany({
    where: { itemId },
    orderBy: { createdAt: "desc" },
    select: HOLDING_SELECT,
  });
  return (rows as Parameters<typeof mapHolding>[0][]).map(mapHolding);
}
