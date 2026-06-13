import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface FleetShipRow {
  id: string;
  shipName: string;
  manufacturer: string | null;
  imageUrl: string | null;
  notes: string | null;
  quantity: number;
  isPublic: boolean;
  ownerMembershipId: string;
  ownerName: string;
}

const SELECT = {
  id: true,
  shipName: true,
  manufacturer: true,
  imageUrl: true,
  notes: true,
  quantity: true,
  isPublic: true,
  ownerMembershipId: true,
  owner: { select: { displayName: true, username: true } },
} as const;

function mapShip(s: {
  id: string;
  shipName: string;
  manufacturer: string | null;
  imageUrl: string | null;
  notes: string | null;
  quantity: number;
  isPublic: boolean;
  ownerMembershipId: string;
  owner: { displayName: string | null; username: string } | null;
}): FleetShipRow {
  return {
    id: s.id,
    shipName: s.shipName,
    manufacturer: s.manufacturer,
    imageUrl: s.imageUrl,
    notes: s.notes,
    quantity: s.quantity,
    isPublic: s.isPublic,
    ownerMembershipId: s.ownerMembershipId,
    ownerName: s.owner?.displayName ?? s.owner?.username ?? "Unknown",
  };
}

/**
 * Returns all public ships in the org plus the viewer's own private ships.
 * Never returns another member's private ships. Always tenant-scoped via db(ctx).
 */
export async function listOrgFleet(
  ctx: TenantContext,
  viewerMembershipId: string,
): Promise<FleetShipRow[]> {
  const rows = await db(ctx).fleetShip.findMany({
    where: { OR: [{ isPublic: true }, { ownerMembershipId: viewerMembershipId }] },
    orderBy: [{ manufacturer: "asc" }, { shipName: "asc" }],
    take: 500,
    select: SELECT,
  });
  return (rows as Parameters<typeof mapShip>[0][]).map(mapShip);
}

/**
 * Returns all ships owned by a specific membership, regardless of isPublic.
 * Tenant isolation enforced by db(ctx) — a membershipId from another tenant
 * yields zero results.
 */
export async function getMemberFleet(
  ctx: TenantContext,
  membershipId: string,
): Promise<FleetShipRow[]> {
  const rows = await db(ctx).fleetShip.findMany({
    where: { ownerMembershipId: membershipId },
    orderBy: { shipName: "asc" },
    select: SELECT,
  });
  return (rows as Parameters<typeof mapShip>[0][]).map(mapShip);
}

/**
 * Returns aggregate fleet statistics for the tenant.
 * Uses findMany+reduce instead of groupBy (groupBy is not proxy-injected).
 */
export async function fleetStats(
  ctx: TenantContext,
): Promise<{ totalShips: number; totalQuantity: number }> {
  const rows = await db(ctx).fleetShip.findMany({ select: { quantity: true } });
  return {
    totalShips: rows.length,
    totalQuantity: (rows as { quantity: number }[]).reduce((sum, r) => sum + r.quantity, 0),
  };
}
