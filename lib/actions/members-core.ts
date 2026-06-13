import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const ProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().trim().url().max(500).refine((u) => u.startsWith("http://") || u.startsWith("https://"), "Must be an http(s) URL").optional(),
}).strict();

export async function updateOwnProfileCore(
  tenantId: string, membershipId: string, input: z.infer<typeof ProfileSchema>,
): Promise<Result> {
  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const ctx = makeTenantContext(tenantId);
  const me = await db(ctx).membership.findFirst({ where: { id: membershipId }, select: { id: true } });
  if (!me) return { ok: false, error: "Member not found" };
  await db(ctx).membership.update({ where: { id: membershipId }, data: parsed.data });
  return { ok: true };
}
