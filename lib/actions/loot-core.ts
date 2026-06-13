import { z } from "zod";
import { db, prismaGlobal } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { setTenantContext } from "../rls";
import { ATTENDANCE_POINTS, ATTENDANCE_STATUSES } from "../loot";

// Constrain T so ok:true results carry typed payloads without polluting the
// error branch. Default to Record<string, unknown> for bare "no payload" results
// (same convention as treasury-core and members-core).
type Result<T extends Record<string, unknown> = Record<string, unknown>> =
  ({ ok: true; error?: never } & T) | { ok: false; error: string };

// Private error classes for clean in-transaction throws.
class OverdrawError extends Error {
  constructor() { super("Insufficient balance"); }
}
class GuardError extends Error {
  constructor(msg: string) { super(msg); }
}

// Max absolute adjustment cap (arbitrary sanity limit).
const MAX_ADJUST_ABS = 1_000_000;

// ---------------------------------------------------------------------------
// Inline balance helper — runs INSIDE a Serializable tx via the tx client so
// the read is part of the same snapshot as the subsequent write.
// ---------------------------------------------------------------------------
// Scans a member's attendance+txn rows (bounded by org activity). Fine at org scale; if a tenant's ledger grows very large, push the SUM into Postgres.
async function balanceInTx(
  tx: Parameters<Parameters<typeof prismaGlobal.$transaction>[0]>[0],
  tenantId: string,
  memberId: string,
): Promise<number> {
  const [atts, txns] = await Promise.all([
    tx.lootAttendance.findMany({
      where: { memberId, tenantId },
      select: { status: true },
    }),
    tx.lootTransaction.findMany({
      where: { memberId, tenantId },
      select: { amountTenths: true },
    }),
  ]);
  const attPts = atts.reduce(
    (s, a) => s + ATTENDANCE_POINTS[a.status as "PRESENT" | "LATE" | "ABSENT"],
    0,
  );
  const txnPts = txns.reduce((s, t) => s + t.amountTenths, 0);
  return attPts + txnPts;
}

// ---------------------------------------------------------------------------
// createLootMemberCore — OFFICER+
// ---------------------------------------------------------------------------
const CreateMemberSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  membershipId: z.string().optional(),
});

export async function createLootMemberCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  input: z.infer<typeof CreateMemberSchema>,
): Promise<Result<{ memberId: string }>> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const parsed = CreateMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const ctx = makeTenantContext(tenantId);
  try {
    const m = await db(ctx).lootMember.create({
      data: {
        tenantId,
        displayName: parsed.data.displayName,
        ...(parsed.data.membershipId ? { membershipId: parsed.data.membershipId } : {}),
      },
      select: { id: true },
    });
    return { ok: true, memberId: m.id };
  } catch (e: unknown) {
    // P2002 = unique constraint violation: tenantId+membershipId duplicate.
    if (isPrismaError(e, "P2002")) {
      return { ok: false, error: "This membership is already linked to a loot member" };
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// createSessionCore — OFFICER+
// ---------------------------------------------------------------------------
const CreateSessionSchema = z.object({
  label: z.string().trim().min(1).max(160),
  sessionDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  notes: z.string().trim().max(500).optional(),
});

export async function createSessionCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  input: z.infer<typeof CreateSessionSchema>,
): Promise<Result<{ sessionId: string }>> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const parsed = CreateSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const ctx = makeTenantContext(tenantId);
  const s = await db(ctx).lootSession.create({
    data: {
      tenantId,
      label: parsed.data.label,
      sessionDate: new Date(parsed.data.sessionDate),
      notes: parsed.data.notes,
      createdByMembershipId: actorMembershipId,
    },
    select: { id: true },
  });
  return { ok: true, sessionId: s.id };
}

// ---------------------------------------------------------------------------
// setAttendanceCore — OFFICER+; upsert on (sessionId, memberId)
// ---------------------------------------------------------------------------
const SetAttendanceSchema = z.object({
  sessionId: z.string().min(1),
  memberId: z.string().min(1),
  status: z.enum(ATTENDANCE_STATUSES),
});

export async function setAttendanceCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  input: z.infer<typeof SetAttendanceSchema>,
): Promise<Result> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const parsed = SetAttendanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const ctx = makeTenantContext(tenantId);
  const { sessionId, memberId, status } = parsed.data;

  // Verify session and member belong to this tenant.
  const [sess, mem] = await Promise.all([
    db(ctx).lootSession.findFirst({ where: { id: sessionId }, select: { id: true } }),
    db(ctx).lootMember.findFirst({ where: { id: memberId }, select: { id: true } }),
  ]);
  if (!sess) return { ok: false, error: "Session not found" };
  if (!mem) return { ok: false, error: "Loot member not found" };

  // The db(ctx) proxy injects tenantId into where/create for upsert.
  // We must also set tenantId explicitly in create because nested create isn't
  // auto-injected (db() security comment). The @@unique([sessionId, memberId])
  // is the upsert key; the proxy appends tenantId to `where` as well.
  await db(ctx).lootAttendance.upsert({
    where: { sessionId_memberId: { sessionId, memberId } } as never,
    create: { tenantId, sessionId, memberId, status: status as never },
    update: { status: status as never },
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// spendLootCore — OFFICER+; atomic balance guard
// ---------------------------------------------------------------------------
const SpendSchema = z.object({
  memberId: z.string().min(1),
  amountTenths: z.number().int().positive(),
  note: z.string().trim().max(500).optional(),
});

export async function spendLootCore(
  tenantId: string,
  actorMembershipId: string,
  actorTier: RankTier,
  input: z.infer<typeof SpendSchema>,
): Promise<Result<{ txnId: string }>> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const parsed = SpendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { memberId, amountTenths, note } = parsed.data;

  try {
    const txnId = await prismaGlobal.$transaction(async (tx) => {
      await setTenantContext(tx, tenantId);

      // Confirm member exists in tenant.
      const mem = await tx.lootMember.findFirst({
        where: { id: memberId, tenantId },
        select: { id: true },
      });
      if (!mem) throw new GuardError("Loot member not found");

      // Authoritative balance read inside the Serializable tx.
      const balance = await balanceInTx(tx, tenantId, memberId);
      if (balance < amountTenths) throw new OverdrawError();

      // The lootTransaction row (with createdByMembershipId) is the audit-of-record for spend/transfer; only COMMAND adjust additionally writes auditLog.
      const t = await tx.lootTransaction.create({
        data: {
          tenantId,
          memberId,
          amountTenths: -amountTenths,
          type: "SPEND",
          note: note ?? null,
          createdByMembershipId: actorMembershipId,
        },
        select: { id: true },
      });
      return t.id;
    }, { isolationLevel: "Serializable" });
    return { ok: true, txnId };
  } catch (e) {
    if (e instanceof OverdrawError) return { ok: false, error: "Insufficient balance" };
    if (e instanceof GuardError) return { ok: false, error: e.message };
    if (isSerializationFailure(e)) return { ok: false, error: "Could not complete — please try again" };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// adjustLootCore — COMMAND only; signed amount; atomic with audit row
// ---------------------------------------------------------------------------
const AdjustSchema = z.object({
  memberId: z.string().min(1),
  amountTenths: z.number().int().min(-MAX_ADJUST_ABS).max(MAX_ADJUST_ABS).refine((n) => n !== 0, "amountTenths must be non-zero"),
  note: z.string().trim().max(500).optional(),
});

export async function adjustLootCore(
  tenantId: string,
  actorMembershipId: string,
  actorAccountId: string,
  actorTier: RankTier,
  input: z.infer<typeof AdjustSchema>,
): Promise<Result> {
  if (!hasTier(actorTier, "COMMAND")) return { ok: false, error: "Requires COMMAND" };
  const parsed = AdjustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  // NOTE: adjust intentionally has NO balance floor — COMMAND may set a member
  // negative (clawback / correction). This is a privileged manual override and
  // is audit-logged. Spend/transfer (non-override) DO guard the floor.
  const { memberId, amountTenths, note } = parsed.data;

  try {
    await prismaGlobal.$transaction(async (tx) => {
      await setTenantContext(tx, tenantId);

      const mem = await tx.lootMember.findFirst({
        where: { id: memberId, tenantId },
        select: { id: true },
      });
      if (!mem) throw new GuardError("Loot member not found");

      await tx.lootTransaction.create({
        data: {
          tenantId,
          memberId,
          amountTenths,
          type: "ADJUST",
          note: note ?? null,
          createdByMembershipId: actorMembershipId,
        },
      });

      // Audit row in same tx — both land or neither.
      await tx.auditLog.create({
        data: {
          tenantId,
          actorAccountId,
          action: "loot.adjust",
          detail: { memberId, amountTenths, note: note ?? null } as never,
        },
      });
    }, { isolationLevel: "Serializable" });
    return { ok: true };
  } catch (e) {
    if (e instanceof GuardError) return { ok: false, error: e.message };
    if (isSerializationFailure(e)) return { ok: false, error: "Could not complete — please try again" };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// transferLootCore — any member who owns fromMemberId; atomic, dual-insert
// ---------------------------------------------------------------------------
const TransferSchema = z.object({
  toMemberId: z.string().min(1),
  amountTenths: z.number().int().positive(),
  note: z.string().trim().max(500).optional(),
});

export async function transferLootCore(
  tenantId: string,
  actorMembershipId: string,
  fromMemberId: string,
  input: z.infer<typeof TransferSchema>,
): Promise<Result> {
  const parsed = TransferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { toMemberId, amountTenths, note } = parsed.data;

  if (fromMemberId === toMemberId) return { ok: false, error: "Cannot transfer to yourself" };

  try {
    await prismaGlobal.$transaction(async (tx) => {
      await setTenantContext(tx, tenantId);

      // Confirm BOTH members exist in this tenant. If toMember belongs to
      // another tenant its tenantId won't match → findFirst returns null → reject.
      // SECURITY: source must be the actor's OWN loot member (membershipId === actor) — a member cannot transfer FROM someone else's balance.
      const [fromMem, toMem] = await Promise.all([
        tx.lootMember.findFirst({ where: { id: fromMemberId, tenantId, membershipId: actorMembershipId }, select: { id: true } }),
        tx.lootMember.findFirst({ where: { id: toMemberId, tenantId }, select: { id: true } }),
      ]);
      if (!fromMem) throw new GuardError("Source member not found or not owned by you");
      if (!toMem) throw new GuardError("Destination member not found or belongs to another org");

      // Authoritative balance read inside the Serializable tx.
      const balance = await balanceInTx(tx, tenantId, fromMemberId);
      if (balance < amountTenths) throw new OverdrawError();

      // The lootTransaction row (with createdByMembershipId) is the audit-of-record for spend/transfer; only COMMAND adjust additionally writes auditLog.
      // Both inserts or neither — inside the same tx.
      await tx.lootTransaction.create({
        data: {
          tenantId,
          memberId: fromMemberId,
          amountTenths: -amountTenths,
          type: "TRANSFER_OUT",
          note: note ?? null,
          relatedMemberId: toMemberId,
          createdByMembershipId: actorMembershipId,
        },
      });
      await tx.lootTransaction.create({
        data: {
          tenantId,
          memberId: toMemberId,
          amountTenths,
          type: "TRANSFER_IN",
          note: note ?? null,
          relatedMemberId: fromMemberId,
          createdByMembershipId: actorMembershipId,
        },
      });
    }, { isolationLevel: "Serializable" });
    return { ok: true };
  } catch (e) {
    if (e instanceof OverdrawError) return { ok: false, error: "Insufficient balance" };
    if (e instanceof GuardError) return { ok: false, error: e.message };
    if (isSerializationFailure(e)) return { ok: false, error: "Could not complete — please try again" };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function isPrismaError(e: unknown, code: string): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: unknown }).code === code
  );
}

function isSerializationFailure(e: unknown): boolean {
  if (isPrismaError(e, "P2034")) return true;
  if (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string" &&
    (e as { message: string }).message.toLowerCase().includes("could not serialize")
  ) return true;
  return false;
}
