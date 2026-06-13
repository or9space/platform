import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface TournamentRow {
  id: string;
  name: string;
  format: string | null;
  status: string;
  startsAt: Date | null;
  entryCount: number;
}

export async function listTournaments(ctx: TenantContext): Promise<TournamentRow[]> {
  const rows = await db(ctx).tournament.findMany({
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      format: true,
      status: true,
      startsAt: true,
      _count: { select: { entries: true } },
    },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    format: t.format,
    status: t.status,
    startsAt: t.startsAt,
    entryCount: t._count.entries,
  }));
}

export interface EntryRow {
  id: string;
  displayName: string;
  participantMembershipId: string | null;
  seed: number | null;
  placement: number | null;
}

export interface TournamentDetail {
  id: string;
  name: string;
  description: string | null;
  format: string | null;
  status: string;
  startsAt: Date | null;
  entries: EntryRow[];
}

export async function getTournamentWithEntries(
  ctx: TenantContext,
  id: string,
): Promise<TournamentDetail | null> {
  const t = await db(ctx).tournament.findFirst({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      format: true,
      status: true,
      startsAt: true,
      entries: {
        select: {
          id: true,
          displayName: true,
          participantMembershipId: true,
          seed: true,
          placement: true,
        },
      },
    },
  });
  if (!t) return null;
  const nl = (n: number | null) => (n == null ? Number.POSITIVE_INFINITY : n);
  const entries = [...t.entries].sort(
    (a, b) =>
      nl(a.placement) - nl(b.placement) ||
      nl(a.seed) - nl(b.seed) ||
      a.displayName.localeCompare(b.displayName),
  );
  return { ...t, entries };
}
