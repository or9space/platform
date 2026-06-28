import { z } from "zod";
import {
  CUSTOM_FIELD_ELIGIBLE_TYPES,
  type ContentTypeName,
} from "../content-types";

const PaletteSchema = z.object({
  primary: z.string().default("oklch(55% 0.18 25)"),
  amber:   z.string().default("oklch(72% 0.16 75)"),
  cream:   z.string().default("oklch(95% 0.008 60)"),
  surface: z.string().default("oklch(18% 0.008 25)"),
});

const BrandingSchema = z.object({
  name: z.string().min(1).max(120),
  tagline: z.string().max(200).nullable().default(null),
  description: z.string().max(600).nullable().default(null),
  logoUrl: z.string().nullable().default(null),
  palette: PaletteSchema.optional().default({}),
  preset: z.enum(["tactical-dark", "tactical-light", "racing-red", "indigo-noir"]).default("tactical-dark"),
  fontHeading: z.enum(["Oswald", "Bebas Neue", "Russo One"]).default("Oswald"),
  fontBody: z.enum(["Lora", "Inter", "IBM Plex Sans"]).default("Lora"),
});

const LabelsSchema = z.object({
  memberSingular: z.string().max(40).default("Member"),
  memberPlural: z.string().max(40).default("Members"),
  branchSingular: z.string().max(40).default("Branch"),
  branchPlural: z.string().max(40).default("Branches"),
  handbookNoun: z.string().max(40).default("Field Handbook"),
  currencyCode: z.string().max(20).default("aUEC"),
  rankEnlisted: z.string().max(40).default("Enlisted"),
  rankNco:      z.string().max(40).default("NCO"),
  rankOfficer:  z.string().max(40).default("Officer"),
  rankCommand:  z.string().max(40).default("Command"),
});

const FeaturesSchema = z.object({
  forums: z.boolean(),
  handbook: z.boolean(),
  loot: z.boolean(),
  inventory: z.boolean(),
  treasury: z.boolean(),
  fleet: z.boolean(),
  tournaments: z.boolean(),
  "calendar.googleIntegration": z.boolean(),
  "discord.bot": z.boolean(),
  ads: z.boolean(),
}).strict();

const CustomFieldKindSchema = z.enum(["text", "number", "enum", "datetime"]);

const CustomFieldDefSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,30}$/),
  label: z.string().max(60),
  kind: CustomFieldKindSchema,
  enumValues: z.array(z.string()).optional(),
  required: z.boolean().default(false),
});

const customFieldsShape = Object.fromEntries(
  CUSTOM_FIELD_ELIGIBLE_TYPES.map((name) => [name, z.array(CustomFieldDefSchema).max(3).optional()]),
) as Record<ContentTypeName, z.ZodOptional<z.ZodArray<typeof CustomFieldDefSchema>>>;

const CustomFieldsSchema = z.object(customFieldsShape).strict().partial();

const IntegrationsSchema = z.object({
  discord: z.object({
    guildId: z.string().nullable().default(null),
    botToken: z.string().nullable().default(null),
  }).nullable().default(null),
  googleCalendar: z.object({
    calendarId: z.string().nullable().default(null),
  }).nullable().default(null),
});

const DomainsSchema = z.object({
  customDomain: z.string().nullable().default(null),
  customDomainStatus: z.enum(["pending", "verifying", "active", "failing"]).nullable().default(null),
});

const AdsSchema = z.object({
  slots: z.array(z.enum(["sidebar-bottom", "between-threads", "below-header"])).default(["sidebar-bottom"]),
  fallbackHouseAd: z.boolean().default(true),
});

export const ConfigSchema = z.object({
  branding: BrandingSchema,
  labels: LabelsSchema,
  features: FeaturesSchema,
  integrations: IntegrationsSchema.default({} as any),
  customFields: CustomFieldsSchema.default({}),
  domains: DomainsSchema.default({} as any),
  ads: AdsSchema.default({} as any),
}).strict();

export type TenantConfig = z.infer<typeof ConfigSchema>;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T>(a: any, b: any): T {
  if (!isPlainObject(a) && !isPlainObject(b)) return (b ?? a) as T;
  if (!isPlainObject(a)) return b as T;
  if (!isPlainObject(b)) return a as T;
  const out: Record<string, unknown> = { ...a };
  for (const key of Object.keys(b)) {
    out[key] = deepMerge((a as any)[key], (b as any)[key]);
  }
  return out as T;
}

/**
 * Layered merge for partial config values from any number of layers.
 * Returns a partial-config object (not validated). Use this in tests; in
 * runtime, callers should pipe the merged result through ConfigSchema.parse.
 */
export function resolveConfigFromValues(...layers: any[]): Partial<TenantConfig> {
  return layers.reduce<Partial<TenantConfig>>((acc, layer) => deepMerge(acc, layer), {} as any);
}
