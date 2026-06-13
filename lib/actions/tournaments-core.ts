import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { writeAudit } from "../audit";

type Result<T extends Record<string, unknown> = Record<string, unknown>> =
  ({ ok: true; error?: never } & T) | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const TournamentStatusValues = ["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETE"] as const;
type TournamentStatus = (typeof TournamentStatusValues)[number];

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  format: z.string().trim().max(80).optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
});

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  format: z.string().trim().max(80).optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
});

const DisplayNameSchema = z.string().trim().min(1).max(120);

// ---------------------------------------------------------------------------
// createTournamentCore
// ---------------------------------------------------------------------------

export async function createTournamentCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  input: z.infer<typeof CreateSchema>,
): Promise<Result<{ tournamentId: string }>> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  const t = await db(ctx).tournament.create({
    data: {
      tenantId,
      name: parsed.data.name,
      description: parsed.data.description,
      format: parsed.data.format,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
      createdByMembershipId: actorMembershipId,
      status: "DRAFT",
    },
    select: { id: true },
  });
  return { ok: true, tournamentId: t.id };
}

// ---------------------------------------------------------------------------
// updateTournamentCore
// ---------------------------------------------------------------------------

export async function updateTournamentCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  id: string,
  patch: z.infer<typeof UpdateSchema>,
): Promise<Result> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const parsed = UpdateSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  const existing = await db(ctx).tournament.findFirst({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: "Tournament not found" };
  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.format !== undefined) data.format = parsed.data.format;
  if (parsed.data.startsAt !== undefined) data.startsAt = new Date(parsed.data.startsAt);
  await db(ctx).tournament.update({ where: { id }, data });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// setTournamentStatusCore
// ---------------------------------------------------------------------------

export async function setTournamentStatusCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  id: string,
  status: string,
): Promise<Result> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  if (!(TournamentStatusValues as readonly string[]).includes(status)) {
    return { ok: false, error: "Invalid status" };
  }
  const ctx = makeTenantContext(tenantId);
  const existing = await db(ctx).tournament.findFirst({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: "Tournament not found" };
  await db(ctx).tournament.update({ where: { id }, data: { status: status as TournamentStatus } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteTournamentCore
// ---------------------------------------------------------------------------

export async function deleteTournamentCore(
  tenantId: string,
  actorMembershipId: string,
  actorAccountId: string,
  actorTier: RankTier,
  id: string,
): Promise<Result> {
  if (!hasTier(actorTier, "COMMAND")) return { ok: false, error: "Requires COMMAND" };
  const ctx = makeTenantContext(tenantId);
  const existing = await db(ctx).tournament.findFirst({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) return { ok: false, error: "Tournament not found" };
  await db(ctx).tournament.delete({ where: { id } });
  await writeAudit(ctx, actorAccountId, "tournament.delete", { id, name: existing.name });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// addEntryCore
// ---------------------------------------------------------------------------

interface AddEntryInput {
  tournamentId: string;
  displayName: string;
  participantMembershipId?: string;
  asOfficer?: boolean;
}

export async function addEntryCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  input: AddEntryInput,
): Promise<Result<{ entryId: string }>> {
  const dnParsed = DisplayNameSchema.safeParse(input.displayName);
  if (!dnParsed.success) return { ok: false, error: dnParsed.error.issues[0]?.message ?? "Invalid displayName" };
  const ctx = makeTenantContext(tenantId);
  const tournament = await db(ctx).tournament.findFirst({
    where: { id: input.tournamentId },
    select: { id: true, status: true },
  });
  if (!tournament) return { ok: false, error: "Tournament not found" };

  if (input.asOfficer) {
    // Officer-managed path: require OFFICER+
    if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
    let resolvedParticipantId: string | null = null;
    if (input.participantMembershipId) {
      const m = await db(ctx).membership.findFirst({
        where: { id: input.participantMembershipId },
        select: { id: true },
      });
      if (!m) return { ok: false, error: "Membership not found in this tenant" };
      resolvedParticipantId = m.id;
    }
    try {
      const entry = await db(ctx).tournamentEntry.create({
        data: {
          tenantId,
          tournamentId: input.tournamentId,
          displayName: dnParsed.data,
          participantMembershipId: resolvedParticipantId,
        },
        select: { id: true },
      });
      return { ok: true, entryId: entry.id };
    } catch (err: unknown) {
      if (isP2002(err)) return { ok: false, error: "Already registered" };
      throw err;
    }
  } else {
    // Self-register path: any member, tournament must be OPEN
    if (tournament.status !== "OPEN") return { ok: false, error: "Registration is not open" };
    try {
      const entry = await db(ctx).tournamentEntry.create({
        data: {
          tenantId,
          tournamentId: input.tournamentId,
          displayName: dnParsed.data,
          participantMembershipId: actorMembershipId,
        },
        select: { id: true },
      });
      return { ok: true, entryId: entry.id };
    } catch (err: unknown) {
      if (isP2002(err)) return { ok: false, error: "Already registered" };
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// removeEntryCore
// ---------------------------------------------------------------------------

export async function removeEntryCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  entryId: string,
): Promise<Result> {
  const ctx = makeTenantContext(tenantId);
  const entry = await db(ctx).tournamentEntry.findFirst({
    where: { id: entryId },
    select: { id: true, participantMembershipId: true },
  });
  if (!entry) return { ok: false, error: "Entry not found" };
  const isOwner = entry.participantMembershipId === actorMembershipId;
  if (!isOwner && !hasTier(actorTier, "OFFICER")) {
    return { ok: false, error: "You can only remove your own entry" };
  }
  await db(ctx).tournamentEntry.delete({ where: { id: entryId } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// recordPlacementCore
// ---------------------------------------------------------------------------

export async function recordPlacementCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  entryId: string,
  placement: number | null,
): Promise<Result> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  if (placement !== null && (!Number.isInteger(placement) || placement < 1)) {
    return { ok: false, error: "Placement must be a positive integer" };
  }
  const ctx = makeTenantContext(tenantId);
  const entry = await db(ctx).tournamentEntry.findFirst({
    where: { id: entryId },
    select: { id: true },
  });
  if (!entry) return { ok: false, error: "Entry not found" };
  await db(ctx).tournamentEntry.update({ where: { id: entryId }, data: { placement } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isP2002(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}
