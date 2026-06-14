# Phase 3i — Integrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. Self-review on Task 2 (config writer + paywall enforcement).

**Goal:** A COMMAND-gated integrations settings editor that stores per-tenant integration config: Discord guild id + Google Calendar id (any plan), and the Discord bot token (PAID-only, paywall-enforced). This wires the `isConfigPathAllowedForPlan` / `PAYWALL_CONFIG_PATHS` scaffold left from Phase 2. No new tables — uses the existing `tenant_config_overrides` JSON + `patchOverrides`. The actual Discord-bot / calendar-sync runtime is OUT of scope (needs external infra / the deferred auth.or9.space broker); this phase ships the config surface + paywall.

**Architecture:** A new `updateIntegrationsCore(tenantId, accountId, input)` in `lib/actions/tenant-config-core.ts`: guardCommand first; reads the tenant's plan server-side (never client); allows `discord.guildId` + `googleCalendar.calendarId` for all plans; allows `discord.botToken` ONLY when the plan permits it via `isConfigPathAllowedForPlan(plan, "integrations.discord.botToken")` (PAID). Writes via `patchOverrides({ integrations: {...} })`. A `"use server"` wrapper + a COMMAND-gated admin page. Config resolves through the existing `ConfigSchema.integrations` + `getFullTenantContext`.

**Tech Stack:** Next 16, Prisma 6, Vitest 4. Reuses Phase 2 `tenant-config-core` (`patchOverrides`, `guardCommand`), `paywall` (`isConfigPathAllowedForPlan`, `PAYWALL_CONFIG_PATHS`), `getFullTenantContext`, the `(tenant-admin)/admin` route group + RSC-leak-guard pattern.

**Branch:** `feat/phase-3i-integrations`.

**Scope cut:** the live Discord bot, slash-command handling, calendar event sync, OAuth broker (auth.or9.space) — all deferred. Custom-domain editor (the other PAYWALL_CONFIG_PATHS entry) — separate, deferred. 3i ships ONLY the integrations config form + botToken paywall.

**Environment (every task):** `C:\Projects\platform`, Bash tool. Dev DB :5434. Baseline tests green (confirm Task 0). Gates: `pnpm test`, `pnpm lint`, `pnpm lint:rule-test`, `pnpm exec tsc --noEmit`; UI task also `pnpm build`. Conventional commits, David Smereski, do NOT push. NO migration/RLS/fuzzer (config overrides is the existing global `tenant_config_overrides`; written via `prismaGlobal` like the other config writers). `gh` at `C:\Program Files\GitHub CLI\gh.exe`.

---

## File Structure (additions / changes)
```
lib/actions/tenant-config-core.ts   ← +updateIntegrationsCore (COMMAND, botToken paid-only)
lib/actions/tenant-config.ts        ← +updateIntegrationsAction wrapper
lib/config/schema.ts                 ← (IntegrationsSchema already exists; no change unless a strict-key issue arises)
app/(tenant-admin)/admin/integrations/page.tsx   ← COMMAND editor (RSC-leak guard)
app/(tenant-admin)/admin/integrations/integrations-form.tsx
tests/integration/tenant-config.test.ts  ← +integrations writer tests (extend existing file)
```

---

## Task 0: Branch
- [ ] `git checkout main; git pull origin main; git checkout -b feat/phase-3i-integrations`. `pnpm test` baseline (expected 228) green.

---

## Task 1: Read the lay of the land
- [ ] Read `lib/actions/tenant-config-core.ts` (esp. `patchOverrides`, `guardCommand`, the `setFeatureFlagCore` server-side plan read), `lib/paywall.ts` (`isConfigPathAllowedForPlan`, `PAYWALL_CONFIG_PATHS`), `lib/config/schema.ts` (`IntegrationsSchema` shape: `discord {guildId, botToken} | null`, `googleCalendar {calendarId} | null`), `lib/actions/tenant-config.ts` (wrapper style), and `app/(tenant-admin)/admin/config/page.tsx` (COMMAND page-guard pattern). No code in this task — just confirm the shapes the next tasks depend on. (This is a read step; no commit.)

---

## Task 2: `updateIntegrationsCore` + paywall wiring (TDD) — security-relevant
**Files:** `lib/actions/tenant-config-core.ts`, extend `tests/integration/tenant-config.test.ts`

- [ ] **Step 1: Failing tests** — append to `tests/integration/tenant-config.test.ts` (it already has `commandAccount`/`enlistedAccount` helpers + `TENANT_A` + `testPrisma`):
```ts
it("COMMAND sets discord.guildId + calendarId (any plan)", async () => {
  const cmd = await commandAccount(TENANT_A.id);
  const r = await updateIntegrationsCore(TENANT_A.id, cmd, { discordGuildId: "123", calendarId: "cal@grp" });
  expect(r.ok).toBe(true);
  const row = await testPrisma.tenantConfigOverride.findUnique({ where: { tenantId: TENANT_A.id } });
  expect((row?.json as any).integrations.discord.guildId).toBe("123");
  expect((row?.json as any).integrations.googleCalendar.calendarId).toBe("cal@grp");
});

it("ENLISTED is rejected", async () => {
  const enl = await enlistedAccount(TENANT_A.id);
  const r = await updateIntegrationsCore(TENANT_A.id, enl, { discordGuildId: "x" });
  expect(r.ok).toBe(false);
});

it("FREE tenant cannot set discord.botToken (paywall); PAID can", async () => {
  // TENANT_A seeded FREE
  const cmd = await commandAccount(TENANT_A.id);
  const denied = await updateIntegrationsCore(TENANT_A.id, cmd, { discordBotToken: "secret-token" });
  expect(denied.ok).toBe(false);
  expect(denied.error).toMatch(/paid/i);
  // upgrade to PAID
  await testPrisma.tenant.update({ where: { id: TENANT_A.id }, data: { plan: "PAID" } });
  const ok = await updateIntegrationsCore(TENANT_A.id, cmd, { discordBotToken: "secret-token" });
  expect(ok.ok).toBe(true);
  const row = await testPrisma.tenantConfigOverride.findUnique({ where: { tenantId: TENANT_A.id } });
  expect((row?.json as any).integrations.discord.botToken).toBe("secret-token");
});

it("rejects an over-long guildId / token", async () => {
  const cmd = await commandAccount(TENANT_A.id);
  const r = await updateIntegrationsCore(TENANT_A.id, cmd, { discordGuildId: "x".repeat(200) });
  expect(r.ok).toBe(false);
});
```
Add `updateIntegrationsCore` to the import at the top of the test file.

- [ ] **Step 2:** red.
- [ ] **Step 3: Implement `updateIntegrationsCore` in `lib/actions/tenant-config-core.ts`:**
```ts
import { isFlagAllowedForPlan, isConfigPathAllowedForPlan } from "../paywall";
// (isConfigPathAllowedForPlan is the new import alongside the existing isFlagAllowedForPlan)

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

  // botToken is paywalled (PAID only) per PAYWALL_CONFIG_PATHS.
  if (parsed.data.discordBotToken != null && parsed.data.discordBotToken !== ""
      && !isConfigPathAllowedForPlan(tenant.plan, "integrations.discord.botToken")) {
    return { ok: false, error: "The Discord bot token requires a paid plan" };
  }

  // Build a partial integrations patch (only the provided keys).
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
```
NOTE: `patchOverrides` deep-merges, so setting only `discord.guildId` preserves a previously-set `botToken` (and vice-versa). Confirm `deepMerge` handles the nested `integrations.discord` correctly (it does — it's the same deep-merge used for branding/labels).

- [ ] **Step 4:** green (expect ~232). lint + tsc clean.
- [ ] **Step 5: Commit** `feat(integrations): COMMAND integrations config writer with botToken paywall`

---

## Task 3: Wrapper
- [ ] **Step 1:** Add to `lib/actions/tenant-config.ts`:
```ts
import { updateIntegrationsCore } from "./tenant-config-core";
// ...
export async function updateIntegrationsAction(input: { discordGuildId?: string | null; discordBotToken?: string | null; calendarId?: string | null }) {
  const a = await acct(); if (!a) return { ok: false as const, error: "Sign in required" };
  const r = await updateIntegrationsCore(tenantIdFromRequest, a, input);  // resolve tenant like the other actions in this file
  if (r.ok) bust(tenantId);
  return r;
}
```
ADAPT to how the other actions in `tenant-config.ts` resolve the tenantId (they take `tenantId` as the first param in Phase 2 — `updateBrandingAction(tenantId, input)`). MATCH that existing convention exactly: `updateIntegrationsAction(tenantId, input)` then `bust(tenantId)`. Read the file and mirror `updateBrandingAction`.
- [ ] **Step 2:** gates (tests still green; lint+tsc+build clean). Commit `feat(integrations): session wrapper for integrations config`

---

## Task 4: Admin UI
**Files:** `app/(tenant-admin)/admin/integrations/page.tsx`, `integrations-form.tsx`
- [ ] **Step 1:** `page.tsx` — COMMAND page-guard (resolve viewer tier; `if (!hasTier(tier,"COMMAND")) return notFound()` BEFORE any data read — mirror `admin/config/page.tsx`). Read current config via `getFullTenantContext()` → `config.integrations` (discord.guildId, googleCalendar.calendarId; do NOT render the botToken value back — show a "set / not set" indicator only, never echo the secret). Read the tenant plan (from the tenant row or features) to know if botToken is allowed; if FREE, show the botToken field disabled with an "upgrade to set" note. Render `<IntegrationsForm tenantId initial={{guildId, calendarId, botTokenSet}} canSetToken={plan==='PAID'} />`.
- [ ] **Step 2:** `integrations-form.tsx` — `"use client"`. Fields: discordGuildId, calendarId (text), discordBotToken (password input, only enabled when `canSetToken`; placeholder "•••• set" if already set, leave blank to keep). On submit → `updateIntegrationsAction(tenantId, { discordGuildId, calendarId, discordBotToken: token || undefined })` (omit token if blank so it isn't overwritten with empty). useTransition + error + router.refresh. NEVER render the existing token value.
- [ ] **Step 3:** Gates: `pnpm build` (route `/admin/integrations` dynamic), `pnpm test` green, lint + tsc clean.
- [ ] **Step 4: Commit** `feat(integrations): COMMAND admin integrations editor (botToken never echoed)`

---

## Task 5: Gate + PR + CI + review + deploy
- [ ] Full gate (test/lint/rule-test/tsc/build — no fuzzer change needed; run it anyway to confirm still clean). Push, PR (gh, --body-file). CI green. Controller holistic review (focus: COMMAND-gated; plan read server-side; botToken PAID-only [FREE rejected]; botToken never echoed to the client; deep-merge preserves other integration keys; no secret in RSC payload). Then deploy: pull, rebuild both images, **NO migration** (config-only), `docker compose up -d` (re-run db:setup-rls is harmless but unnecessary — skip unless other phases pending). Authed walk: COMMAND opens `/admin/integrations`, sets a guild id + calendar id (saves); on FREE, botToken field disabled; confirm the page never shows a stored token.

---

## Self-Review
**Spec coverage:** integrations config (guild/calendar any plan; botToken PAID) ✓; paywall wired (isConfigPathAllowedForPlan) ✓; COMMAND-gated admin UI ✓; secret never echoed ✓.
**Security:** COMMAND gate; plan server-side; botToken PAID-only; token never rendered back (no RSC secret leak); deep-merge preserves keys; `.strict()` input schema rejects unknown keys.
**Deferrals:** live Discord bot, calendar sync, OAuth broker, custom-domain editor.
**Type consistency:** `updateIntegrationsCore(tenantId, accountId, input)`; wrapper `updateIntegrationsAction(tenantId, input)` matching Phase 2 convention.

---
## Execution
Subagent-driven (sonnet codes, opus reviews). Self-review on Task 2. Controller deploy after merge (no migration).
