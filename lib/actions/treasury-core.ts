import { z } from "zod";
import { db, prismaGlobal } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { setTenantContext } from "../rls";
import { TREASURY_TYPES, TREASURY_CATEGORIES } from "../treasury";

type Result<T extends Record<string, unknown> = Record<string, unknown>> =
  ({ ok: true; error?: never } & T) | { ok: false; error: string };

const MAX_AMOUNT = 1_000_000_000;

const EntrySchema = z.object({
  type: z.enum(TREASURY_TYPES),
  category: z.enum(TREASURY_CATEGORIES),
  amount: z.number().int().positive().max(MAX_AMOUNT),
  description: z.string().trim().min(1).max(500),
});

export async function createTreasuryEntryCore(
  tenantId: string, membershipId: string, actorTier: RankTier, input: z.infer<typeof EntrySchema>,
): Promise<Result<{ entryId: string }>> {
  if (!hasTier(actorTier, "OFFICER")) return { ok: false, error: "Requires OFFICER" };
  const parsed = EntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  const e = await db(ctx).treasuryEntry.create({
    data: {
      tenantId, authorMembershipId: membershipId,
      type: parsed.data.type, category: parsed.data.category,
      amount: parsed.data.amount, description: parsed.data.description,
    },
    select: { id: true },
  });
  return { ok: true, entryId: e.id };
}

export async function deleteTreasuryEntryCore(
  tenantId: string, actorAccountId: string, actorTier: RankTier, entryId: string,
): Promise<Result> {
  if (!hasTier(actorTier, "COMMAND")) return { ok: false, error: "Requires COMMAND" };
  const ctx = makeTenantContext(tenantId);
  const e = await db(ctx).treasuryEntry.findFirst({
    where: { id: entryId }, select: { id: true, type: true, amount: true, category: true },
  });
  if (!e) return { ok: false, error: "Entry not found" };
  // Atomic: delete + audit in one tx so a money deletion can never land without
  // its audit row (and vice-versa). setTenantContext scopes RLS inside the tx.
  await prismaGlobal.$transaction(async (tx) => {
    await setTenantContext(tx, tenantId);
    await tx.treasuryEntry.delete({ where: { id: entryId } });
    await tx.auditLog.create({
      data: { tenantId, actorAccountId, action: "treasury.entry.delete", detail: { entryId, type: e.type, amount: e.amount, category: e.category } as never },
    });
  });
  return { ok: true };
}
