import { z } from "zod";
import { prismaGlobal } from "../db";
import { requireTier } from "../authz";
import { ForbiddenError } from "../permissions";
import { isFlagAllowedForPlan, isConfigPathAllowedForPlan } from "../paywall";
import { isValidFlagKey, FEATURE_FLAGS } from "../feature-flags";
import { isCustomFieldEligible } from "../content-types";

type Result<T = object> = ({ ok: true; error?: string } & T) | { ok: false; error: string };

const PLATFORM_CONTROLLED = new Set(FEATURE_FLAGS.filter((f) => !f.tenantEditable).map((f) => f.key));

async function patchOverrides(tenantId: string, patch: Record<string, unknown>): Promise<void> {
  const existing = await prismaGlobal.tenantConfigOverride.findUnique({ where: { tenantId } });
  const current = (existing?.json as Record<string, unknown>) ?? {};
  const merged = deepMerge(current, patch);
  await prismaGlobal.tenantConfigOverride.upsert({
    where: { tenantId },
    update: { json: merged as never },
    create: { tenantId, json: merged as never },
  });
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function deepMerge(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const k of Object.keys(b)) {
    const bv = b[k], av = a[k];
    out[k] = isObj(av) && isObj(bv) ? deepMerge(av, bv) : bv;
  }
  return out;
}

async function guardCommand(tenantId: string, accountId: string): Promise<Result> {
  try {
    await requireTier(tenantId, accountId, "COMMAND");
    return { ok: true };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: e.message };
    throw e;
  }
}

const BrandingSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  tagline: z.string().max(200).nullable().optional(),
  preset: z.enum(["tactical-dark", "tactical-light", "racing-red", "indigo-noir"]).optional(),
}).strict();

export async function updateBrandingCore(
  tenantId: string, accountId: string, input: z.infer<typeof BrandingSchema>,
): Promise<Result> {
  const g = await guardCommand(tenantId, accountId); if (!g.ok) return g;
  const parsed = BrandingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  await patchOverrides(tenantId, { branding: parsed.data });
  return { ok: true };
}

const LabelsSchema = z.object({
  memberSingular: z.string().max(40).optional(),
  memberPlural: z.string().max(40).optional(),
  branchSingular: z.string().max(40).optional(),
  branchPlural: z.string().max(40).optional(),
  handbookNoun: z.string().max(40).optional(),
  currencyCode: z.string().max(20).optional(),
  rankEnlisted: z.string().max(40).optional(),
  rankNco: z.string().max(40).optional(),
  rankOfficer: z.string().max(40).optional(),
  rankCommand: z.string().max(40).optional(),
}).strict();

export async function updateLabelsCore(
  tenantId: string, accountId: string, input: z.infer<typeof LabelsSchema>,
): Promise<Result> {
  const g = await guardCommand(tenantId, accountId); if (!g.ok) return g;
  const parsed = LabelsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  await patchOverrides(tenantId, { labels: parsed.data });
  return { ok: true };
}

export async function setFeatureFlagCore(
  tenantId: string, accountId: string, key: string, enabled: boolean,
): Promise<Result> {
  const g = await guardCommand(tenantId, accountId); if (!g.ok) return g;
  if (!isValidFlagKey(key)) return { ok: false, error: "Unknown feature" };
  if (PLATFORM_CONTROLLED.has(key)) return { ok: false, error: "That feature is managed by or9.space" };
  // SECURITY: the plan is read server-side from the tenant row — NEVER from a
  // client argument — so a FREE tenant cannot spoof plan="PAID" to unlock a
  // paid-only flag (discord.bot).
  const tenant = await prismaGlobal.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  if (!tenant) return { ok: false, error: "Org not found" };
  if (enabled && !isFlagAllowedForPlan(tenant.plan, key)) return { ok: false, error: "That feature requires a paid plan" };
  await prismaGlobal.tenantFeatureFlag.upsert({
    where: { tenantId_key: { tenantId, key } },
    update: { enabled },
    create: { tenantId, key, enabled },
  });
  return { ok: true };
}

const CustomFieldDefSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,30}$/),
  label: z.string().max(60),
  kind: z.enum(["text", "number", "enum", "datetime"]),
  enumValues: z.array(z.string()).max(20).optional(),
  required: z.boolean().optional(),
}).strict();

export async function upsertCustomFieldDefCore(
  tenantId: string, accountId: string, typeName: string, input: z.infer<typeof CustomFieldDefSchema>,
): Promise<Result> {
  const g = await guardCommand(tenantId, accountId); if (!g.ok) return g;
  if (!isCustomFieldEligible(typeName)) return { ok: false, error: "That content type does not support custom fields" };
  const parsed = CustomFieldDefSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const existing = await prismaGlobal.tenantConfigOverride.findUnique({ where: { tenantId } });
  const json = (existing?.json as Record<string, any>) ?? {};
  const cf = (json.customFields ?? {}) as Record<string, Array<{ key: string }>>;
  const list = cf[typeName] ?? [];
  const idx = list.findIndex((d) => d.key === parsed.data.key);
  if (idx === -1 && list.length >= 3) return { ok: false, error: "At most 3 custom fields per type" };
  if (idx === -1) list.push(parsed.data); else list[idx] = parsed.data;
  await patchOverrides(tenantId, { customFields: { [typeName]: list } });
  return { ok: true };
}

export async function deleteCustomFieldDefCore(
  tenantId: string, accountId: string, typeName: string, key: string,
): Promise<Result> {
  const g = await guardCommand(tenantId, accountId); if (!g.ok) return g;
  const existing = await prismaGlobal.tenantConfigOverride.findUnique({ where: { tenantId } });
  const json = (existing?.json as Record<string, any>) ?? {};
  const cf = (json.customFields ?? {}) as Record<string, Array<{ key: string }>>;
  cf[typeName] = (cf[typeName] ?? []).filter((d) => d.key !== key);
  json.customFields = cf;
  await prismaGlobal.tenantConfigOverride.upsert({
    where: { tenantId },
    update: { json: json as never },
    create: { tenantId, json: json as never },
  });
  return { ok: true };
}

const IntegrationsInputSchema = z.object({
  discordGuildId: z.string().trim().max(40).nullable().optional(),
  discordBotToken: z.string().trim().max(120).nullable().optional(),
  calendarId: z.string().trim().max(120).nullable().optional(),
}).strict();

export async function updateIntegrationsCore(
  tenantId: string, accountId: string, input: z.infer<typeof IntegrationsInputSchema>,
): Promise<Result> {
  const g = await guardCommand(tenantId, accountId); if (!g.ok) return g;
  const parsed = IntegrationsInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  // SECURITY: plan read server-side from the tenant row (never a client arg).
  const tenant = await prismaGlobal.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  if (!tenant) return { ok: false, error: "Org not found" };

  if (parsed.data.discordBotToken != null && parsed.data.discordBotToken !== ""
      && !isConfigPathAllowedForPlan(tenant.plan, "integrations.discord.botToken")) {
    return { ok: false, error: "The Discord bot token requires a paid plan" };
  }

  const discord: Record<string, unknown> = {};
  if (parsed.data.discordGuildId !== undefined) discord.guildId = parsed.data.discordGuildId;
  if (parsed.data.discordBotToken !== undefined) discord.botToken = parsed.data.discordBotToken;
  const integrations: Record<string, unknown> = {};
  if (Object.keys(discord).length) integrations.discord = discord;
  if (parsed.data.calendarId !== undefined) integrations.googleCalendar = { calendarId: parsed.data.calendarId };
  if (!Object.keys(integrations).length) return { ok: false, error: "No changes specified" };

  await patchOverrides(tenantId, { integrations });
  return { ok: true };
}
