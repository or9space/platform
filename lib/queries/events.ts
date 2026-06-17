import { db } from "../db";
import type { TenantContext } from "../tenant";

export interface EventRow {
  id: string;
  title: string;
  type: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  goingCount: number;
}

export interface RsvpEntry {
  membershipId: string;
  name: string;
  username: string;
  status: string;
}

export interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  createdByName: string;
  rsvps: RsvpEntry[];
  counts: { GOING: number; MAYBE: number; NOT_GOING: number };
}

function toRow(e: {
  id: string; title: string; type: string; startsAt: Date; endsAt: Date | null;
  location: string | null; rsvps: { id: string }[];
}): EventRow {
  return {
    id: e.id, title: e.title, type: e.type, startsAt: e.startsAt, endsAt: e.endsAt,
    location: e.location, goingCount: e.rsvps.length,
  };
}

const ROW_SELECT = {
  id: true, title: true, type: true, startsAt: true, endsAt: true, location: true,
  rsvps: { where: { status: "GOING" as const }, select: { id: true } },
};

/** Soonest upcoming events (startsAt >= now). For the dashboard + list. */
export async function listUpcomingEvents(ctx: TenantContext, limit = 5): Promise<EventRow[]> {
  const rows = await db(ctx).event.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: limit,
    select: ROW_SELECT,
  });
  return rows.map(toRow);
}

/** Past events, most-recent first. */
export async function listPastEvents(ctx: TenantContext, limit = 20): Promise<EventRow[]> {
  const rows = await db(ctx).event.findMany({
    where: { startsAt: { lt: new Date() } },
    orderBy: { startsAt: "desc" },
    take: limit,
    select: ROW_SELECT,
  });
  return rows.map(toRow);
}

export async function getEvent(ctx: TenantContext, eventId: string): Promise<EventDetail | null> {
  const e = await db(ctx).event.findFirst({
    where: { id: eventId },
    select: {
      id: true, title: true, description: true, type: true, startsAt: true, endsAt: true, location: true,
      createdBy: { select: { displayName: true, username: true } },
      rsvps: {
        orderBy: { createdAt: "asc" },
        select: {
          membershipId: true, status: true,
          membership: { select: { displayName: true, username: true } },
        },
      },
    },
  });
  if (!e) return null;
  const counts = { GOING: 0, MAYBE: 0, NOT_GOING: 0 };
  const rsvps: RsvpEntry[] = e.rsvps.map((r) => {
    counts[r.status as keyof typeof counts] += 1;
    return {
      membershipId: r.membershipId,
      name: r.membership?.displayName ?? r.membership?.username ?? "Unknown",
      username: r.membership?.username ?? "",
      status: r.status,
    };
  });
  return {
    id: e.id, title: e.title, description: e.description, type: e.type,
    startsAt: e.startsAt, endsAt: e.endsAt, location: e.location,
    createdByName: e.createdBy?.displayName ?? e.createdBy?.username ?? "Unknown",
    rsvps, counts,
  };
}

/** All events within a calendar month window (first day 00:00 to last day 23:59:59). */
export async function listEventsByMonth(
  ctx: TenantContext,
  year: number,
  month: number, // 0-indexed
): Promise<EventRow[]> {
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const rows = await db(ctx).event.findMany({
    where: { startsAt: { gte: start, lte: end } },
    orderBy: { startsAt: "asc" },
    select: ROW_SELECT,
  });
  return rows.map(toRow);
}

export async function getMyRsvp(
  ctx: TenantContext, eventId: string, membershipId: string,
): Promise<string | null> {
  const r = await db(ctx).eventRsvp.findFirst({
    where: { eventId, membershipId },
    select: { status: true },
  });
  return r?.status ?? null;
}
