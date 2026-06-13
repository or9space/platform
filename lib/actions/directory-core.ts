import { z } from "zod";
import { prismaGlobal } from "../db";
import { requireTier } from "../authz";
import { ForbiddenError } from "../permissions";

type Result = { ok: true } | { ok: false; error: string };

const Schema = z
  .object({
    isListed: z.boolean(),
    tagline: z.string().trim().max(200).nullable().optional(),
  })
  .strict();

export async function setDirectoryListingCore(
  tenantId: string,
  accountId: string,
  input: z.infer<typeof Schema>,
): Promise<Result> {
  try {
    await requireTier(tenantId, accountId, "COMMAND");
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const data: Record<string, unknown> = { isListed: parsed.data.isListed };
  if (parsed.data.tagline !== undefined) data.tagline = parsed.data.tagline;

  await prismaGlobal.tenant.update({ where: { id: tenantId }, data });
  return { ok: true };
}
