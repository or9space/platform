# Phase 2 — Config + Tenant Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give each tenant's COMMAND admins a live config editor (branding, labels, feature flags, custom fields) that writes `tenant_config_overrides` / `tenant_feature_flags`, with paywall enforcement; make feature flags actually gate routes (404 when off); and render tenant-relabeled nouns via an `<L>` component.

**Architecture:** Per-tenant authorization via a new `getViewerMembership` + `requireTier` (resolves the signed-in global account's membership tier within the current tenant). A `resolveTenantFeatures` merge (plan defaults → `tenant_feature_flags` overrides) feeding a `requireFeature` route guard. A COMMAND-gated `/admin` shell on tenant hosts with a config editor backed by zod-validated, paywall-checked server actions that write the override tables and `revalidateTag` the tenant config cache.

**Tech Stack:** Next 16, Prisma 6, NextAuth 5 (existing `getSessionAccountId`), zod (existing `ConfigSchema`), Vitest 4. RLS is ON in prod (`app_user` + `RLS_ENABLED=1`) — `membership` is RLS-protected, so all per-tenant membership reads MUST go through `db(ctx)` (sets `app.tenant_id`), never `prismaGlobal`.

**Spec ref:** `docs/superpowers/specs/2026-06-11-or9-space-platform-design.md` §5 (config), §6 (flags + content types), Q14 (per-tenant flags), Q15 (A+ custom fields).

**Branch:** `feat/phase-2-config-admin`.

**Environment (every task):**
- `C:\Projects\platform`, PowerShell only (Bash mangles cwd). Dev DB `or9-pg` :5434 via `.env`.
- 84 tests green at start. Gates per task: `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`; UI tasks also `pnpm build`.
- Conventional commits, David Smereski. Do NOT push (controller batches PR).
- ESLint `or9/no-untenanted-query`: `membership`, `userRank`, `auditLog`, custom-field tables are tenant-scoped — use `db(ctx)`, never `prismaGlobal.<those>`. Global tables (account, tenant, tenantConfigOverride, tenantFeatureFlag, pendingTenant, support*) stay on `prismaGlobal`.
- RLS reality: tests run as superuser (RLS bypassed) but `db(ctx)` still injects the WHERE filter, so tests exercise the injection path. The membership reads in this phase use `db(ctx)` so they work in both dev (superuser) and prod (app_user).

---

## File Structure (end state additions)

```
lib/
  authz.ts                          ← getViewerMembership, requireTier, ViewerMembership
  features.ts                       ← resolveTenantFeatures, isFeatureEnabled, requireFeature, FeatureMap
  paywall.ts                        ← PAYWALL_FLAGS, PAYWALL_CONFIG_PATHS, assertPaywallAllowed
  actions/
    tenant-config.ts                ← updateBranding, updateLabels, setFeatureFlag, upsertCustomFieldDef, deleteCustomFieldDef
  config/
    apply-defaults.ts               ← featureDefaultsForPlan (reads FEATURE_FLAGS matrix)
components/
  l.tsx                             ← <L> server component (tenant label lookup)
app/
  (tenant-admin)/admin/             ← tenant host /admin (COMMAND-gated)
    layout.tsx
    page.tsx                        ← admin home
    config/page.tsx                 ← config editor (branding/labels/flags)
    config/branding-form.tsx
    config/labels-form.tsx
    config/feature-toggles.tsx
    config/custom-fields-editor.tsx
  forums/layout.tsx                 ← requireFeature("forums") gate (example; one per flag-owned section)
tests/
  unit/features.test.ts
  unit/paywall.test.ts
  integration/authz.test.ts
  integration/tenant-config.test.ts
```

---

## Task 0: Branch

- [ ] **Step 1:** `cd C:\Projects\platform; git checkout main; git pull origin main; git checkout -b feat/phase-2-config-admin`
- [ ] **Step 2:** Confirm `git log -1` shows the Phase 1.5 merge (`418f0ed` or later) and `pnpm test` = 84 green.

---

## Task 1: Per-tenant authorization — getViewerMembership + requireTier (TDD)

**Files:** `lib/authz.ts`, `tests/integration/authz.test.ts`

The signed-in identity is a global `accountId` (from session). A user's POWER is their `Membership.tier` within the CURRENT tenant. This resolves it via `db(ctx)` (RLS-safe).

- [ ] **Step 1: Failing integration test** `tests/integration/authz.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getViewerMembership, requireTier } from "@/lib/authz";
import { ForbiddenError } from "@/lib/permissions";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

describe("per-tenant authorization", () => {
  let accountId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTwoTenants();
    const acc = await testPrisma.account.create({ data: { email: "az@it-test.example" } });
    accountId = acc.id;
    await testPrisma.membership.create({
      data: { accountId, tenantId: TENANT_A.id, username: "azuser", tier: "OFFICER" },
    });
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("returns the viewer's membership + tier in the current tenant", async () => {
    const m = await getViewerMembership(TENANT_A.id, accountId);
    expect(m?.tier).toBe("OFFICER");
    expect(m?.username).toBe("azuser");
  });

  it("returns null when the account has no membership in this tenant", async () => {
    const m = await getViewerMembership(TENANT_B.id, accountId);
    expect(m).toBeNull();
  });

  it("requireTier passes when tier is sufficient", async () => {
    const m = await requireTier(TENANT_A.id, accountId, "NCO");
    expect(m.tier).toBe("OFFICER");
  });

  it("requireTier throws ForbiddenError when tier is too low", async () => {
    await expect(requireTier(TENANT_A.id, accountId, "COMMAND")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("requireTier throws when no membership", async () => {
    await expect(requireTier(TENANT_B.id, accountId, "ENLISTED")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("requireTier throws when accountId is null (not signed in)", async () => {
    await expect(requireTier(TENANT_A.id, null, "ENLISTED")).rejects.toBeInstanceOf(ForbiddenError);
  });
});
```

- [ ] **Step 2:** `pnpm test` — new file fails (module not found). Report red.

- [ ] **Step 3: Implement `lib/authz.ts`:**

```ts
import { db } from "./db";
import { makeTenantContext } from "./tenant";
import { hasTier, ForbiddenError, type RankTier } from "./permissions";

export interface ViewerMembership {
  id: string;
  username: string;
  displayName: string | null;
  tier: RankTier;
}

/**
 * The signed-in global account's membership within a specific tenant, or null.
 * Reads through db(ctx) so the RLS-protected `memberships` table is queried
 * with app.tenant_id set (works under both dev superuser and prod app_user).
 */
export async function getViewerMembership(
  tenantId: string,
  accountId: string | null,
): Promise<ViewerMembership | null> {
  if (!accountId) return null;
  const ctx = makeTenantContext(tenantId);
  const m = await db(ctx).membership.findFirst({
    where: { accountId },
    select: { id: true, username: true, displayName: true, tier: true },
  });
  return m as ViewerMembership | null;
}

/**
 * Throws ForbiddenError unless the account holds at least `required` tier in
 * the tenant. Returns the membership on success.
 */
export async function requireTier(
  tenantId: string,
  accountId: string | null,
  required: RankTier,
): Promise<ViewerMembership> {
  const m = await getViewerMembership(tenantId, accountId);
  if (!m || !hasTier(m.tier, required)) {
    throw new ForbiddenError(`Requires ${required} in this org`);
  }
  return m;
}
```

- [ ] **Step 4:** `pnpm test` — green (90 total). `pnpm lint`, `pnpm exec tsc --noEmit` clean.

- [ ] **Step 5: Commit** `feat(authz): per-tenant getViewerMembership + requireTier via db(ctx)`

---

## Task 2: Feature resolution + requireFeature (TDD)

**Files:** `lib/config/apply-defaults.ts`, `lib/features.ts`, `tests/unit/features.test.ts`

- [ ] **Step 1: Implement `lib/config/apply-defaults.ts`** (pure, no DB — derives the plan default map from the FEATURE_FLAGS matrix):

```ts
import { FEATURE_FLAGS, type FeatureFlagKey } from "../feature-flags";
import type { TenantPlan } from "../db";

export type FeatureMap = Record<FeatureFlagKey, boolean>;

/** The default on/off map for a plan, straight from the locked FEATURE_FLAGS matrix. */
export function featureDefaultsForPlan(plan: TenantPlan): FeatureMap {
  const map = {} as FeatureMap;
  for (const f of FEATURE_FLAGS) {
    map[f.key] = plan === "PAID" ? f.defaultPaid : f.defaultFree;
  }
  return map;
}
```

- [ ] **Step 2: Failing test** `tests/unit/features.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { featureDefaultsForPlan } from "@/lib/config/apply-defaults";
import { resolveTenantFeatures, isFeatureEnabled } from "@/lib/features";

describe("feature defaults by plan", () => {
  it("free tier: fleet/tournaments/discord off, forums on, ads on", () => {
    const f = featureDefaultsForPlan("FREE");
    expect(f.forums).toBe(true);
    expect(f.fleet).toBe(false);
    expect(f.tournaments).toBe(false);
    expect(f["discord.bot"]).toBe(false);
    expect(f.ads).toBe(true);
  });
  it("paid tier: fleet/tournaments/discord on, ads off", () => {
    const f = featureDefaultsForPlan("PAID");
    expect(f.fleet).toBe(true);
    expect(f.tournaments).toBe(true);
    expect(f["discord.bot"]).toBe(true);
    expect(f.ads).toBe(false);
  });
});

describe("resolveTenantFeatures", () => {
  it("applies DB overrides on top of plan defaults", () => {
    const f = resolveTenantFeatures("FREE", [{ key: "fleet", enabled: true }]);
    expect(f.fleet).toBe(true);     // overridden on
    expect(f.forums).toBe(true);    // default kept
  });
  it("ignores unknown override keys", () => {
    const f = resolveTenantFeatures("FREE", [{ key: "not-a-flag", enabled: true }]);
    expect((f as Record<string, boolean>)["not-a-flag"]).toBeUndefined();
  });
  it("ads is platform-controlled: a tenant override cannot turn ads off", () => {
    const f = resolveTenantFeatures("FREE", [{ key: "ads", enabled: false }]);
    expect(f.ads).toBe(true);       // override on `ads` is ignored
  });
  it("isFeatureEnabled reads the resolved map", () => {
    const f = resolveTenantFeatures("PAID", []);
    expect(isFeatureEnabled(f, "fleet")).toBe(true);
  });
});
```

- [ ] **Step 3:** `pnpm test` — red. Report.

- [ ] **Step 4: Implement `lib/features.ts`:**

```ts
import { FEATURE_FLAGS, isValidFlagKey, type FeatureFlagKey } from "./feature-flags";
import { featureDefaultsForPlan, type FeatureMap } from "./config/apply-defaults";
import { FeatureDisabledError } from "./permissions";
import type { TenantPlan } from "./db";

const PLATFORM_CONTROLLED: ReadonlySet<FeatureFlagKey> = new Set(
  FEATURE_FLAGS.filter((f) => !f.tenantEditable).map((f) => f.key),
);

export type { FeatureMap };

/**
 * Final feature on/off map: plan defaults overlaid with tenant_feature_flags
 * rows. Platform-controlled flags (ads) ignore tenant overrides. Unknown keys
 * are dropped.
 */
export function resolveTenantFeatures(
  plan: TenantPlan,
  overrides: ReadonlyArray<{ key: string; enabled: boolean }>,
): FeatureMap {
  const map = featureDefaultsForPlan(plan);
  for (const o of overrides) {
    if (!isValidFlagKey(o.key)) continue;
    if (PLATFORM_CONTROLLED.has(o.key)) continue;
    map[o.key] = o.enabled;
  }
  return map;
}

export function isFeatureEnabled(map: FeatureMap, key: FeatureFlagKey): boolean {
  return map[key] === true;
}

/** Route/action guard: throws FeatureDisabledError if the feature is off. */
export function requireFeature(map: FeatureMap, key: FeatureFlagKey): void {
  if (!isFeatureEnabled(map, key)) throw new FeatureDisabledError(key);
}
```

- [ ] **Step 5:** `pnpm test` green (94). lint + tsc clean.
- [ ] **Step 6: Commit** `feat(features): plan-default + tenant-override feature resolution`

---

## Task 3: Server-side tenant feature loader + integration (TDD)

**Files:** `lib/server/get-tenant-features.ts`, `tests/integration/tenant-features.test.ts`

- [ ] **Step 1: Failing test** `tests/integration/tenant-features.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { loadTenantFeatures } from "@/lib/server/get-tenant-features";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A } from "./setup";

describe("loadTenantFeatures", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.tenantFeatureFlag.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("returns plan defaults when no overrides", async () => {
    const f = await loadTenantFeatures({ id: TENANT_A.id, plan: "FREE" });
    expect(f.forums).toBe(true);
    expect(f.fleet).toBe(false);
  });

  it("applies a stored override", async () => {
    await testPrisma.tenantFeatureFlag.create({
      data: { tenantId: TENANT_A.id, key: "fleet", enabled: true },
    });
    const f = await loadTenantFeatures({ id: TENANT_A.id, plan: "FREE" });
    expect(f.fleet).toBe(true);
  });
});
```

- [ ] **Step 2:** red. Report.

- [ ] **Step 3: Implement `lib/server/get-tenant-features.ts`:**

```ts
import { prismaGlobal, type TenantPlan } from "../db";
import { resolveTenantFeatures, type FeatureMap } from "../features";

/** tenant_feature_flags is a GLOBAL table (no tenant_id RLS) — prismaGlobal is correct. */
export async function loadTenantFeatures(tenant: { id: string; plan: TenantPlan }): Promise<FeatureMap> {
  const overrides = await prismaGlobal.tenantFeatureFlag.findMany({
    where: { tenantId: tenant.id },
    select: { key: true, enabled: true },
  });
  return resolveTenantFeatures(tenant.plan, overrides);
}
```

- [ ] **Step 4:** green (96). lint + tsc clean.
- [ ] **Step 5: Commit** `feat(features): server loader merging tenant_feature_flags overrides`

---

## Task 4: Gate a feature-owned route + the `<L>` label component

**Files:** `app/forums/layout.tsx`, `components/l.tsx`, `lib/server/get-tenant-config-full.ts`

Phase 1 has no `/forums` yet (Phase 3 builds it). To prove the flag-gating pattern WITHOUT inventing a feature, this task creates a minimal gated stub route + the `<L>` component used everywhere later.

- [ ] **Step 1: Create `lib/server/get-tenant-config-full.ts`** — one call that returns tenant + resolved config + features for a request:

```ts
import { getCurrentTenant, getTenantDbOverrides } from "./get-tenant";
import { resolveTenantConfig } from "../config";
import { loadTenantFeatures } from "./get-tenant-features";
import type { FeatureMap } from "../features";
import type { TenantConfig } from "../config/schema";

export interface FullTenantContext {
  tenant: NonNullable<Awaited<ReturnType<typeof getCurrentTenant>>>;
  config: TenantConfig;
  features: FeatureMap;
}

/** Resolve everything a tenant page needs, or null if not on a tenant host. */
export async function getFullTenantContext(): Promise<FullTenantContext | null> {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const [config, features] = await Promise.all([
    getTenantDbOverrides(tenant.id).then((o) => resolveTenantConfig(tenant.plan, o)),
    loadTenantFeatures(tenant),
  ]);
  return { tenant, config, features };
}
```

- [ ] **Step 2: Create `components/l.tsx`** — server component label lookup:

```tsx
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import type { TenantConfig } from "@/lib/config/schema";

type LabelKey = keyof TenantConfig["labels"];

/**
 * Renders a tenant-configured label. Server component: reads the tenant config
 * once per render. Falls back to the provided `fallback` off a tenant host.
 *   <L k="memberPlural" fallback="Members" />
 */
export async function L({ k, fallback }: { k: LabelKey; fallback: string }) {
  const ctx = await getFullTenantContext();
  return <>{ctx?.config.labels[k] ?? fallback}</>;
}
```

- [ ] **Step 3: Create the gated stub `app/forums/layout.tsx`:**

```tsx
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";

export default async function ForumsLayout({ children }: { children: ReactNode }) {
  const ctx = await getFullTenantContext();
  if (!ctx || !isFeatureEnabled(ctx.features, "forums")) notFound();
  return <>{children}</>;
}
```

And a stub page `app/forums/page.tsx`:

```tsx
import { L } from "@/components/l";

export default function ForumsStubPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Forums</h1>
      <p className="text-neutral-400">
        Coming in Phase 3. This route is gated by the <code>forums</code> feature flag —
        a tenant with forums disabled gets a 404 here.
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        Tenant calls its members: <L k="memberPlural" fallback="Members" />.
      </p>
    </main>
  );
}
```

- [ ] **Step 4:** `pnpm build` — compiles; `/forums` appears as a dynamic route. `pnpm test` 96 green. lint + tsc clean.

- [ ] **Step 5: Live-verify the gate** (forums defaults ON for free, so it renders; flip it off via DB and confirm 404):

```powershell
cd C:\Projects\platform
pnpm db:seed
node node_modules/next/dist/bin/next build *> $null; Start-Process -FilePath "node" -ArgumentList "node_modules/next/dist/bin/next","start","-p","3008" -WindowStyle Hidden -WorkingDirectory "C:\Projects\platform"
Start-Sleep 9
# forums ON by default → 200 with "Forums"
curl.exe -s -H "Host: demo.localhost:3008" "http://localhost:3008/forums" | Select-String "Forums|404"
# turn it off for demo, expect 404
docker exec or9-pg psql -U postgres -d platform_dev -c "INSERT INTO tenant_feature_flags (id,tenant_id,key,enabled) SELECT 'ff-demo-forums', id, 'forums', false FROM tenants WHERE slug='demo' ON CONFLICT (tenant_id,key) DO UPDATE SET enabled=false"
curl.exe -s -o NUL -w "%{http_code}" -H "Host: demo.localhost:3008" "http://localhost:3008/forums"
# cleanup the flag + kill server
docker exec or9-pg psql -U postgres -d platform_dev -c "DELETE FROM tenant_feature_flags WHERE id='ff-demo-forums'"
$p=(Get-NetTCPConnection -LocalPort 3008 -State Listen -ErrorAction SilentlyContinue).OwningProcess; if($p){Stop-Process -Id $p -Force}
```

EXPECTED: first curl shows "Forums"; the http_code after disabling is `404`. Report both. (Next caches; if the flag change doesn't reflect because of ISR, note it — the page reads features per request so it should reflect immediately.)

- [ ] **Step 6: Commit** `feat(features): forums route flag-gated + <L> tenant label component`

---

## Task 5: Paywall rules (TDD)

**Files:** `lib/paywall.ts`, `tests/unit/paywall.test.ts`

- [ ] **Step 1: Failing test** `tests/unit/paywall.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isFlagAllowedForPlan, isConfigPathAllowedForPlan, PaywallError } from "@/lib/paywall";

describe("paywall", () => {
  it("free tier cannot enable discord.bot", () => {
    expect(isFlagAllowedForPlan("FREE", "discord.bot")).toBe(false);
    expect(isFlagAllowedForPlan("PAID", "discord.bot")).toBe(true);
  });
  it("free tier CAN enable fleet/tournaments (off by default but not paid-locked)", () => {
    // fleet/tournaments default off on free but are not paidOnly — a free tenant may enable them.
    expect(isFlagAllowedForPlan("FREE", "fleet")).toBe(true);
    expect(isFlagAllowedForPlan("FREE", "tournaments")).toBe(true);
  });
  it("free tier cannot set a custom domain; paid can", () => {
    expect(isConfigPathAllowedForPlan("FREE", "domains.customDomain")).toBe(false);
    expect(isConfigPathAllowedForPlan("PAID", "domains.customDomain")).toBe(true);
  });
  it("non-paywalled config paths are allowed on free", () => {
    expect(isConfigPathAllowedForPlan("FREE", "branding.name")).toBe(true);
  });
  it("PaywallError is an Error subclass", () => {
    expect(new PaywallError("x")).toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 2:** red.

- [ ] **Step 3: Implement `lib/paywall.ts`:**

```ts
import { FEATURE_FLAGS, type FeatureFlagKey } from "./feature-flags";
import type { TenantPlan } from "./db";

/** Config dotted-paths that only paid tenants may set. */
export const PAYWALL_CONFIG_PATHS: ReadonlySet<string> = new Set([
  "domains.customDomain",
  "integrations.discord.botToken",
]);

const PAID_ONLY_FLAGS: ReadonlySet<FeatureFlagKey> = new Set(
  FEATURE_FLAGS.filter((f) => f.paidOnly).map((f) => f.key),
);

export class PaywallError extends Error {
  constructor(message = "This requires a paid plan") {
    super(message);
    this.name = "PaywallError";
  }
}

export function isFlagAllowedForPlan(plan: TenantPlan, key: FeatureFlagKey): boolean {
  if (plan === "PAID") return true;
  return !PAID_ONLY_FLAGS.has(key);
}

export function isConfigPathAllowedForPlan(plan: TenantPlan, path: string): boolean {
  if (plan === "PAID") return true;
  return !PAYWALL_CONFIG_PATHS.has(path);
}
```

- [ ] **Step 4:** green (101). lint + tsc clean.
- [ ] **Step 5: Commit** `feat(paywall): plan-gated flags + config paths`

---

## Task 6: Config write actions (TDD)

**Files:** `lib/actions/tenant-config.ts`, `tests/integration/tenant-config.test.ts`

All actions: resolve session accountId → `requireTier(tenantId, accountId, "COMMAND")` → zod-validate → paywall-check → write `tenant_config_overrides` (deep-merge) or `tenant_feature_flags` → `revalidateTag`. Core functions take explicit accountId for testability (mirrors support-core pattern); thin `"use server"` wrappers resolve the session.

- [ ] **Step 1: Failing integration test** `tests/integration/tenant-config.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  updateBrandingCore, setFeatureFlagCore, upsertCustomFieldDefCore,
} from "@/lib/actions/tenant-config-core";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A } from "./setup";

async function commandAccount(tenantId: string) {
  const acc = await testPrisma.account.create({ data: { email: `cmd-${Math.random().toString(36).slice(2,6)}@it-test.example` } });
  await testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username: `cmd${Math.random().toString(36).slice(2,6)}`, tier: "COMMAND" } });
  return acc.id;
}
async function enlistedAccount(tenantId: string) {
  const acc = await testPrisma.account.create({ data: { email: `enl-${Math.random().toString(36).slice(2,6)}@it-test.example` } });
  await testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username: `enl${Math.random().toString(36).slice(2,6)}`, tier: "ENLISTED" } });
  return acc.id;
}

describe("tenant-config write actions", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.tenantConfigOverride.deleteMany({});
    await testPrisma.tenantFeatureFlag.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("COMMAND can update branding name; persists to overrides", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    const r = await updateBrandingCore(TENANT_A.id, cmd, { name: "Alpha Renamed" });
    expect(r.ok).toBe(true);
    const row = await testPrisma.tenantConfigOverride.findUnique({ where: { tenantId: TENANT_A.id } });
    expect((row?.json as any).branding.name).toBe("Alpha Renamed");
  });

  it("ENLISTED is rejected", async () => {
    const enl = await enlistedAccount(TENANT_A.id);
    const r = await updateBrandingCore(TENANT_A.id, enl, { name: "Nope" });
    expect(r.ok).toBe(false);
  });

  it("deep-merges: setting labels keeps existing branding", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    await updateBrandingCore(TENANT_A.id, cmd, { name: "Keep Me" });
    const { updateLabelsCore } = await import("@/lib/actions/tenant-config-core");
    await updateLabelsCore(TENANT_A.id, cmd, { memberPlural: "Pilots" });
    const row = await testPrisma.tenantConfigOverride.findUnique({ where: { tenantId: TENANT_A.id } });
    expect((row?.json as any).branding.name).toBe("Keep Me");
    expect((row?.json as any).labels.memberPlural).toBe("Pilots");
  });

  it("COMMAND can toggle a feature flag (fleet on)", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    const r = await setFeatureFlagCore(TENANT_A.id, cmd, "FREE", "fleet", true);
    expect(r.ok).toBe(true);
    const ff = await testPrisma.tenantFeatureFlag.findUnique({ where: { tenantId_key: { tenantId: TENANT_A.id, key: "fleet" } } });
    expect(ff?.enabled).toBe(true);
  });

  it("FREE tenant cannot enable a paid-only flag (discord.bot)", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    const r = await setFeatureFlagCore(TENANT_A.id, cmd, "FREE", "discord.bot", true);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/paid/i);
  });

  it("cannot toggle platform-controlled ads", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    const r = await setFeatureFlagCore(TENANT_A.id, cmd, "FREE", "ads", false);
    expect(r.ok).toBe(false);
  });

  it("custom field def: COMMAND adds one to forum_thread", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    const r = await upsertCustomFieldDefCore(TENANT_A.id, cmd, "forum_thread", {
      key: "bounty", label: "Bounty", kind: "number",
    });
    expect(r.ok).toBe(true);
    const row = await testPrisma.tenantConfigOverride.findUnique({ where: { tenantId: TENANT_A.id } });
    expect((row?.json as any).customFields.forum_thread[0].key).toBe("bounty");
  });

  it("custom field def: rejects a 4th field on the same type (max 3)", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    for (const k of ["a", "b", "c"]) {
      await upsertCustomFieldDefCore(TENANT_A.id, cmd, "forum_thread", { key: k, label: k.toUpperCase(), kind: "text" });
    }
    const r = await upsertCustomFieldDefCore(TENANT_A.id, cmd, "forum_thread", { key: "d", label: "D", kind: "text" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/3/);
  });

  it("custom field def: rejects an ineligible type (forum_post)", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    const r = await upsertCustomFieldDefCore(TENANT_A.id, cmd, "forum_post" as any, { key: "x", label: "X", kind: "text" });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2:** red.

- [ ] **Step 3: Implement `lib/actions/tenant-config-core.ts`** (no auth/session import — testable; the `"use server"` wrapper file imports auth):

```ts
import { z } from "zod";
import { prismaGlobal, type TenantPlan } from "../db";
import { requireTier } from "../authz";
import { ForbiddenError } from "../permissions";
import { isFlagAllowedForPlan } from "../paywall";
import { isValidFlagKey, FEATURE_FLAGS, type FeatureFlagKey } from "../feature-flags";
import { isCustomFieldEligible } from "../content-types";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const PLATFORM_CONTROLLED = new Set(FEATURE_FLAGS.filter((f) => !f.tenantEditable).map((f) => f.key));

async function patchOverrides(tenantId: string, patch: Record<string, unknown>): Promise<void> {
  const existing = await prismaGlobal.tenantConfigOverride.findUnique({ where: { tenantId } });
  const current = (existing?.json as Record<string, unknown>) ?? {};
  const merged = deepMerge(current, patch);
  await prismaGlobal.tenantConfigOverride.upsert({
    where: { tenantId },
    update: { json: merged },
    create: { tenantId, json: merged },
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
  tenantId: string, accountId: string, plan: TenantPlan, key: string, enabled: boolean,
): Promise<Result> {
  const g = await guardCommand(tenantId, accountId); if (!g.ok) return g;
  if (!isValidFlagKey(key)) return { ok: false, error: "Unknown feature" };
  if (PLATFORM_CONTROLLED.has(key)) return { ok: false, error: "That feature is managed by or9.space" };
  if (enabled && !isFlagAllowedForPlan(plan, key)) return { ok: false, error: "That feature requires a paid plan" };
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
});

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
    where: { tenantId }, update: { json }, create: { tenantId, json },
  });
  return { ok: true };
}
```

NOTE on customFields deep-merge: `patchOverrides` deep-merges, but arrays REPLACE (deepMerge only recurses objects). Setting `customFields: { forum_thread: [...] }` replaces that type's whole array — correct (we pass the full new list). Other types' arrays under `customFields` are preserved because deepMerge recurses the `customFields` object and only overwrites the `forum_thread` key.

- [ ] **Step 4:** green (110). lint + tsc clean.

- [ ] **Step 5: Create the `"use server"` wrapper `lib/actions/tenant-config.ts`:**

```ts
"use server";

import { revalidateTag } from "next/cache";
import { getSessionAccountId } from "../auth";
import {
  updateBrandingCore, updateLabelsCore, setFeatureFlagCore,
  upsertCustomFieldDefCore, deleteCustomFieldDefCore,
} from "./tenant-config-core";
import type { TenantPlan } from "../db";

async function acct(): Promise<string | null> { return getSessionAccountId(); }
function bust(tenantId: string) { revalidateTag(`tenant-config:${tenantId}`); }

export async function updateBrandingAction(tenantId: string, input: { name?: string; tagline?: string | null; preset?: string }) {
  const a = await acct(); if (!a) return { ok: false as const, error: "Sign in required" };
  const r = await updateBrandingCore(tenantId, a, input as never); if (r.ok) bust(tenantId); return r;
}
export async function updateLabelsAction(tenantId: string, input: Record<string, string>) {
  const a = await acct(); if (!a) return { ok: false as const, error: "Sign in required" };
  const r = await updateLabelsCore(tenantId, a, input as never); if (r.ok) bust(tenantId); return r;
}
export async function setFeatureFlagAction(tenantId: string, plan: TenantPlan, key: string, enabled: boolean) {
  const a = await acct(); if (!a) return { ok: false as const, error: "Sign in required" };
  const r = await setFeatureFlagCore(tenantId, a, plan, key, enabled); if (r.ok) bust(tenantId); return r;
}
export async function upsertCustomFieldDefAction(tenantId: string, typeName: string, input: { key: string; label: string; kind: string; enumValues?: string[]; required?: boolean }) {
  const a = await acct(); if (!a) return { ok: false as const, error: "Sign in required" };
  const r = await upsertCustomFieldDefCore(tenantId, a, typeName, input as never); if (r.ok) bust(tenantId); return r;
}
export async function deleteCustomFieldDefAction(tenantId: string, typeName: string, key: string) {
  const a = await acct(); if (!a) return { ok: false as const, error: "Sign in required" };
  const r = await deleteCustomFieldDefCore(tenantId, a, typeName, key); if (r.ok) bust(tenantId); return r;
}
```

NOTE: `resolveTenantConfig` in `lib/config/index.ts` is NOT currently wrapped in `unstable_cache` with a tag, so `revalidateTag` is a harmless no-op today. Wrap it in Step 6 so the bust actually clears a cache.

- [ ] **Step 6: Add caching to `resolveTenantConfig` path.** In `lib/server/get-tenant-config-full.ts`, wrap the per-tenant resolve in `unstable_cache` keyed + tagged `tenant-config:${tenant.id}` with `revalidate: 60`. Confirm `revalidateTag` in the actions now targets a real cache. Keep the pure `resolveTenantConfig` uncached (tests use it directly).

- [ ] **Step 7:** gates green. **Commit** `feat(config): COMMAND-gated branding/labels/flags/custom-field write actions + cache busting`

---

## Task 7: Tenant admin shell + config editor UI

**Files:** `app/(tenant-admin)/admin/layout.tsx`, `.../admin/page.tsx`, `.../admin/config/page.tsx`, `.../admin/config/branding-form.tsx`, `.../admin/config/labels-form.tsx`, `.../admin/config/feature-toggles.tsx`, `.../admin/config/custom-fields-editor.tsx`

Route group `(tenant-admin)` so `/admin` on a tenant host is COMMAND-gated. (This is the TENANT admin, distinct from the platform `admin-portal` subdomain.)

- [ ] **Step 1: `app/(tenant-admin)/admin/layout.tsx`** — gate by COMMAND in the current tenant:

```tsx
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/server/get-tenant";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";

export default async function TenantAdminLayout({ children }: { children: ReactNode }) {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();
  const accountId = await getSessionAccountId();
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m || !hasTier(m.tier, "COMMAND")) {
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">{tenant.name} — admin</h1>
        <p className="mt-3 text-neutral-400">You need COMMAND rank in this org. <a className="underline" href="/login">Sign in</a>.</p>
      </main>
    );
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800 p-4">
        <nav className="flex gap-6 text-sm">
          <a href="/admin" className="font-bold">{tenant.name} admin</a>
          <a href="/admin/config" className="text-neutral-400 hover:text-neutral-100">Configuration</a>
          <a href="/" className="text-neutral-400 hover:text-neutral-100">View site</a>
        </nav>
      </header>
      <main className="mx-auto max-w-2xl p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: `app/(tenant-admin)/admin/page.tsx`:**

```tsx
export default function TenantAdminHome() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-neutral-400">Manage your org. <a className="underline" href="/admin/config">Configuration →</a></p>
    </div>
  );
}
```

- [ ] **Step 3: `app/(tenant-admin)/admin/config/page.tsx`** — loads current config + features and renders the forms:

```tsx
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { notFound } from "next/navigation";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { CUSTOM_FIELD_ELIGIBLE_TYPES } from "@/lib/content-types";
import { BrandingForm } from "./branding-form";
import { LabelsForm } from "./labels-form";
import { FeatureToggles } from "./feature-toggles";
import { CustomFieldsEditor } from "./custom-fields-editor";

export default async function ConfigPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const { tenant, config, features } = ctx;
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-xl font-semibold">Branding</h2>
        <BrandingForm tenantId={tenant.id} initial={{ name: config.branding.name, tagline: config.branding.tagline, preset: config.branding.preset }} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Labels</h2>
        <LabelsForm tenantId={tenant.id} initial={config.labels} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Features</h2>
        <FeatureToggles
          tenantId={tenant.id}
          plan={tenant.plan}
          flags={FEATURE_FLAGS.map((f) => ({ key: f.key, label: f.label, enabled: features[f.key], tenantEditable: f.tenantEditable, paidOnly: f.paidOnly }))}
        />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Custom fields</h2>
        <CustomFieldsEditor
          tenantId={tenant.id}
          eligibleTypes={[...CUSTOM_FIELD_ELIGIBLE_TYPES]}
          defs={(config.customFields ?? {}) as Record<string, Array<{ key: string; label: string; kind: string }>>}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: `branding-form.tsx`** (client):

```tsx
"use client";
import { useState, useTransition } from "react";
import { updateBrandingAction } from "@/lib/actions/tenant-config";

export function BrandingForm({ tenantId, initial }: { tenantId: string; initial: { name: string; tagline: string | null; preset: string } }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return; setMsg(null);
    start(async () => {
      const r = await updateBrandingAction(tenantId, {
        name: String(fd.get("name") ?? ""),
        tagline: (String(fd.get("tagline") ?? "") || null),
        preset: String(fd.get("preset") ?? "tactical-dark"),
      });
      setMsg(r.ok ? "Saved." : r.error);
    });
  }
  return (
    <form action={submit} className="space-y-3">
      {msg && <p className="text-sm text-neutral-300">{msg}</p>}
      <label className="block text-sm">Org name
        <input name="name" defaultValue={initial.name} className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      </label>
      <label className="block text-sm">Tagline
        <input name="tagline" defaultValue={initial.tagline ?? ""} className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      </label>
      <label className="block text-sm">Theme
        <select name="preset" defaultValue={initial.preset} className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2">
          <option value="tactical-dark">Tactical Dark</option>
          <option value="tactical-light">Tactical Light</option>
          <option value="racing-red">Racing Red</option>
          <option value="indigo-noir">Indigo Noir</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50">{pending ? "Saving…" : "Save branding"}</button>
    </form>
  );
}
```

- [ ] **Step 5: `labels-form.tsx`** (client) — same pattern, fields for the 6 labels, calls `updateLabelsAction`. Use `defaultValue={initial.<key>}` for each.

```tsx
"use client";
import { useState, useTransition } from "react";
import { updateLabelsAction } from "@/lib/actions/tenant-config";

const FIELDS: Array<{ name: string; label: string }> = [
  { name: "memberSingular", label: "Member (singular)" },
  { name: "memberPlural", label: "Members (plural)" },
  { name: "branchSingular", label: "Branch (singular)" },
  { name: "branchPlural", label: "Branches (plural)" },
  { name: "handbookNoun", label: "Handbook noun" },
  { name: "currencyCode", label: "Currency code" },
];

export function LabelsForm({ tenantId, initial }: { tenantId: string; initial: Record<string, string> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return; setMsg(null);
    start(async () => {
      const input: Record<string, string> = {};
      for (const f of FIELDS) input[f.name] = String(fd.get(f.name) ?? "");
      const r = await updateLabelsAction(tenantId, input);
      setMsg(r.ok ? "Saved." : r.error);
    });
  }
  return (
    <form action={submit} className="space-y-3">
      {msg && <p className="text-sm text-neutral-300">{msg}</p>}
      {FIELDS.map((f) => (
        <label key={f.name} className="block text-sm">{f.label}
          <input name={f.name} defaultValue={initial[f.name] ?? ""} className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
        </label>
      ))}
      <button type="submit" disabled={pending} className="rounded bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50">{pending ? "Saving…" : "Save labels"}</button>
    </form>
  );
}
```

- [ ] **Step 6: `feature-toggles.tsx`** (client) — a row per flag with a toggle; platform-controlled flags disabled; paid-only flags on a free tenant show "Paid" + disabled:

```tsx
"use client";
import { useState, useTransition } from "react";
import { setFeatureFlagAction } from "@/lib/actions/tenant-config";

type Flag = { key: string; label: string; enabled: boolean; tenantEditable: boolean; paidOnly: boolean };

export function FeatureToggles({ tenantId, plan, flags }: { tenantId: string; plan: "FREE" | "PAID"; flags: Flag[] }) {
  const [state, setState] = useState<Record<string, boolean>>(Object.fromEntries(flags.map((f) => [f.key, f.enabled])));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(f: Flag) {
    if (pending) return; setMsg(null);
    const next = !state[f.key];
    start(async () => {
      const r = await setFeatureFlagAction(tenantId, plan, f.key, next);
      if (r.ok) setState((s) => ({ ...s, [f.key]: next })); else setMsg(`${f.label}: ${r.error}`);
    });
  }

  return (
    <div className="space-y-2">
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      {flags.map((f) => {
        const locked = !f.tenantEditable || (f.paidOnly && plan === "FREE");
        return (
          <div key={f.key} className="flex items-center justify-between rounded border border-neutral-800 p-3">
            <span className="text-sm">{f.label}
              {!f.tenantEditable && <span className="ml-2 text-xs text-neutral-500">managed by or9.space</span>}
              {f.paidOnly && plan === "FREE" && <span className="ml-2 text-xs text-amber-400">Paid</span>}
            </span>
            <button disabled={locked || pending} onClick={() => toggle(f)}
              className={`rounded px-3 py-1 text-sm disabled:opacity-40 ${state[f.key] ? "bg-green-700" : "border border-neutral-700"}`}>
              {state[f.key] ? "On" : "Off"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: `custom-fields-editor.tsx`** (client) — per eligible type, list defs + add-form (≤3) + delete:

```tsx
"use client";
import { useState, useTransition } from "react";
import { upsertCustomFieldDefAction, deleteCustomFieldDefAction } from "@/lib/actions/tenant-config";

type Def = { key: string; label: string; kind: string };

export function CustomFieldsEditor({ tenantId, eligibleTypes, defs }: { tenantId: string; eligibleTypes: string[]; defs: Record<string, Def[]> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add(typeName: string, fd: FormData) {
    if (pending) return; setMsg(null);
    start(async () => {
      const r = await upsertCustomFieldDefAction(tenantId, typeName, {
        key: String(fd.get("key") ?? ""), label: String(fd.get("label") ?? ""), kind: String(fd.get("kind") ?? "text"),
      });
      if (!r.ok) setMsg(`${typeName}: ${r.error}`); else window.location.reload();
    });
  }
  function remove(typeName: string, key: string) {
    if (pending) return;
    start(async () => { await deleteCustomFieldDefAction(tenantId, typeName, key); window.location.reload(); });
  }

  return (
    <div className="space-y-6">
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      {eligibleTypes.map((t) => {
        const list = defs[t] ?? [];
        return (
          <div key={t} className="rounded border border-neutral-800 p-3">
            <p className="mb-2 font-mono text-sm text-neutral-300">{t} <span className="text-neutral-500">({list.length}/3)</span></p>
            <ul className="mb-2 space-y-1">
              {list.map((d) => (
                <li key={d.key} className="flex items-center justify-between text-sm">
                  <span><code>{d.key}</code> · {d.label} · {d.kind}</span>
                  <button onClick={() => remove(t, d.key)} disabled={pending} className="text-xs text-red-400 hover:underline disabled:opacity-40">remove</button>
                </li>
              ))}
            </ul>
            {list.length < 3 && (
              <form action={(fd) => add(t, fd)} className="flex flex-wrap items-end gap-2">
                <input name="key" required placeholder="key" pattern="[a-z][a-z0-9_]{0,30}" className="w-28 rounded border border-neutral-700 bg-neutral-900 p-1.5 text-sm" />
                <input name="label" required placeholder="Label" className="w-36 rounded border border-neutral-700 bg-neutral-900 p-1.5 text-sm" />
                <select name="kind" className="rounded border border-neutral-700 bg-neutral-900 p-1.5 text-sm">
                  <option value="text">text</option><option value="number">number</option><option value="enum">enum</option><option value="datetime">datetime</option>
                </select>
                <button type="submit" disabled={pending} className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900 disabled:opacity-50">Add</button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 8:** `pnpm build` (route table shows `/admin`, `/admin/config`), `pnpm test` (110 green), `pnpm lint`, `pnpm exec tsc --noEmit` clean.

- [ ] **Step 9: Live-verify the editor end-to-end** (start on 3009, log in as a COMMAND member of demo, change the name, confirm it renders). Since driving NextAuth login via curl is hard, instead verify the SERVER path: confirm `/admin/config` returns the COMMAND wall when unauthenticated (curl shows "need COMMAND rank"), and confirm the route compiles + the page is reachable. Full auth'd walk happens in Step 10 deploy or by David. Report the unauth wall output.

- [ ] **Step 10: Commit** `feat(admin): tenant admin shell + live config editor (branding/labels/flags/custom-fields)`

---

## Task 8: Gate + PR + CI

- [ ] **Step 1:** `pnpm test` (110), `pnpm lint`, `pnpm lint:rule-test`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm fuzz:leak` (APP_USER_PASSWORD set) — all green.
- [ ] **Step 2:** push `feat/phase-2-config-admin`, open PR vs main.
- [ ] **Step 3:** watch `gh pr checks --watch` → green.
- [ ] **Step 4: STOP** — controller holistic review (focus: every config action is COMMAND-gated + paywall-checked; no `prismaGlobal` on RLS tables; custom-field caps enforced server-side; revalidate targets a real cache). Then merge + deploy + authed prod walk.

---

## Task 9: Deploy (controller, after merge)

- [ ] Pull + rebuild on VPS, restart next-app (no migration — Phase 2 adds no tables; tenant_feature_flags + tenant_config_overrides already exist from Phase 1).
- [ ] Authed prod walk: as the demo founder (COMMAND), open `<demo>.or9.space/admin/config`, rename the org + relabel members + toggle fleet on + add a custom field, then confirm the homepage reflects the new name and `/fleet` (Phase 3 stub) would be reachable. Confirm an ENLISTED member gets the COMMAND wall.

---

## Self-Review

**Spec coverage:** §5 config editor (Task 6/7) ✓; §6 flag enforcement (Task 2/3/4) + content-type custom fields (Task 6) ✓; Q14 per-tenant flags (Task 2/3) ✓; Q15 A+ ≤3 custom fields on eligible types, 4 kinds (Task 6) ✓; paywall (Task 5) ✓; `<L>` labels (Task 4) ✓; per-tenant COMMAND authz (Task 1) ✓.

**RLS correctness:** membership reads use `db(ctx)` (Task 1) — works under prod app_user. Config/flag tables are global → `prismaGlobal` (lint-allowed). No tenant-scoped table touched via `prismaGlobal`.

**Placeholder scan:** none — all steps carry full code.

**Type consistency:** `FeatureMap`/`FeatureFlagKey` from feature-flags; `requireTier(tenantId, accountId, tier)` signature consistent Task 1↔6↔7; `*Core(tenantId, accountId, …)` pattern uniform; `tenantId_key` matches `@@unique([tenantId, key])` on TenantFeatureFlag; custom-field eligible types from `CUSTOM_FIELD_ELIGIBLE_TYPES`.

**Known deferrals:** palette/font editing (only preset in v2 — full OKLCH picker is a polish follow-up); custom-field VALUES on records (the defs exist; using them on forum threads etc. lands with Phase 3 content types); enum-kind `enumValues` UI (schema accepts it; the add-form only does text/number/enum/datetime without the enum-values sub-input — enum picks render but values default empty, acceptable for v2).

---

## Execution

Subagent-driven. Two-stage review on the security-critical write-actions task (Task 6) + authz (Task 1). Controller runs deploy (Task 9) after merge + holistic review.
