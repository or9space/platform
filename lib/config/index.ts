import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { ConfigSchema, resolveConfigFromValues, type TenantConfig } from "./schema";
import { prismaGlobal, type TenantPlan } from "../db";

const CONFIG_DIR = path.join(process.cwd(), "lib", "config");

async function readYaml(rel: string): Promise<any> {
  const full = path.join(CONFIG_DIR, rel);
  const raw = await fs.readFile(full, "utf8");
  return yaml.load(raw) ?? {};
}

export async function loadPlatformDefaults(): Promise<any> {
  return await readYaml("defaults.yaml");
}

export async function loadPlanDefaults(plan: TenantPlan): Promise<any> {
  const fileName = plan === "FREE" ? "free.yaml" : "paid.yaml";
  try {
    return await readYaml(path.join("plans", fileName));
  } catch (e) {
    // paid.yaml lives in platform-paid; in OSS-only it's absent. Treat as {}.
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw e;
  }
}

/**
 * Resolve final tenant config from layered sources. Returns a validated,
 * fully-defaulted TenantConfig. Throws ZodError if the merge produces an
 * invalid shape. Callers are responsible for the DB-override layer.
 */
export async function resolveTenantConfig(
  plan: TenantPlan,
  dbOverrides: Record<string, unknown> = {},
): Promise<TenantConfig> {
  const [platform, planDefaults] = await Promise.all([
    loadPlatformDefaults(),
    loadPlanDefaults(plan),
  ]);
  const merged = resolveConfigFromValues(platform, planDefaults, dbOverrides);
  return ConfigSchema.parse(merged);
}

/** The tenant's admin-edited config overrides (deepest layer). */
export async function getTenantDbOverrides(tenantId: string): Promise<Record<string, unknown>> {
  const row = await prismaGlobal.tenantConfigOverride.findUnique({ where: { tenantId } });
  return (row?.json as Record<string, unknown>) ?? {};
}
