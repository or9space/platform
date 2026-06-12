# Phase 1 — Platform Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the tenant lifecycle (signup → approval → provisioning → founder claim), email/password auth with global accounts + per-tenant memberships, the support portal, and the three-layer tenant-isolation hardening (RLS + ESLint rule + leak fuzzer) — so a stranger can request an org, you can approve it, and they can claim + run it.

**Architecture:** Single Next 16 app (Phase 0). New subsystems: NextAuth 5 credentials auth bound to the global `Account` table; host-classified routing (tenant / marketing / admin / support) via middleware rewrites; an idempotent provisioning function invoked from admin server actions; Postgres RLS enforced through a dedicated non-superuser app role + a Prisma client extension that `set_config`s `app.tenant_id` per operation; an ESLint flat-config custom rule banning untenanted Prisma access; a leak fuzzer harness run nightly in CI.

**Tech Stack:** Next 16, NextAuth 5 (beta, credentials provider), bcryptjs, Prisma 6, Postgres 16 (VPS compose + CI service), Resend (env-gated), Cloudflare Turnstile (env-gated), Vitest 4 (unit + integration), ESLint 9 flat config.

**Spec reference:** `docs/superpowers/specs/2026-06-11-or9-space-platform-design.md` (moved into this repo by Task 0). Sections §4 (data model), §5 (config), §7 (tenant lifecycle), §9 (testing), Q13 (identity), Q16 (support).

**Locked deviations from spec (decided at plan time):**
- Discord OAuth deferred to Phase 1.5 (wildcard-subdomain redirect URIs impossible on Discord; needs an `auth.or9.space` broker — own mini-plan).
- Resend + Turnstile are env-gated: absent key = console-log emails / skipped captcha. Claim URLs always surface in the admin UI so the flow works without email.
- `middleware.ts` keeps its name despite the Next 16 "use proxy" deprecation warning (rename deferred until the proxy convention is verified against docs; warning is cosmetic).
- Demo-tenant nightly reset deferred (spec open question; not in Phase 1 exit criteria).
- Prisma model for config overrides is named `TenantConfigOverride` (mapped to `tenant_config_overrides`) to avoid a type-name collision with `lib/config/schema.ts`'s exported `TenantConfig` type.

**Environment notes for all tasks:**
- Working dir `C:\Projects\platform` unless stated. Use PowerShell (Bash mangles cwd on this machine).
- Local dev DB: Docker container `or9-pg`, `postgresql://postgres:postgres@localhost:5434/platform_dev` (both `DATABASE_URL` and `DIRECT_URL` in `.env`).
- 33 unit tests green at start; `pnpm test`, `pnpm typecheck`, `pnpm build` all pass.
- Git identity: David Smereski <dsmereski@gmail.com>. Conventional commits. Do NOT push unless a task says to.
- Phase 1 work happens on branch `feat/phase-1-skeleton` (Task 0 creates it).

---

## File Structure (end state)

```
platform/
  app/
    (auth)/login/page.tsx              ← tenant-host login
    (auth)/register/page.tsx           ← tenant-host register
    claim/page.tsx                     ← founder claim (tenant host)
    start-org/page.tsx                 ← public signup form (marketing host)
    _admin/                            ← admin.or9.space (middleware rewrite)
      layout.tsx                       ← requirePlatformAdmin gate
      page.tsx                         ← admin home
      tenants/pending/page.tsx         ← approval queue
      support/page.tsx                 ← triage list
      support/[ticketId]/page.tsx      ← admin thread view
    _support/                          ← support.or9.space (middleware rewrite)
      layout.tsx                       ← auth gate
      page.tsx                         ← submit + my tickets
      tickets/[ticketId]/page.tsx      ← member thread view
    api/auth/[...nextauth]/route.ts    ← NextAuth handler
  lib/
    auth.ts                            ← NextAuth config + auth() helper
    password.ts                        ← bcrypt hash/verify
    platform-admin.ts                  ← requirePlatformAdmin
    rate-limit.ts                      ← in-memory sliding window
    email.ts                           ← Resend wrapper, console fallback
    turnstile.ts                       ← captcha verify, env-gated
    provisioning.ts                    ← approve/reject/provision/claim core
    host-classifier.ts                 ← {kind} from Host (extends tenant-resolver)
    rls.ts                             ← RLS-aware client extension
    actions/
      signup.ts                        ← createPendingTenant
      admin-tenants.ts                 ← approvePendingTenant, rejectPendingTenant
      claim.ts                         ← claimFounderSeat
      support.ts                       ← createTicket, replyTicket, closeTicket
  eslint-rules/
    no-untenanted-query.js             ← custom rule
  eslint.config.mjs                    ← flat config + local plugin
  prisma/
    schema.prisma                      ← +8 models/enums, Membership.tier
    migrations/<ts>_phase1_lifecycle_support/
    rls/setup-roles.sql                ← app_user role + grants (deploy-time)
    rls/policies.sql                   ← RLS policy template applied per table
  scripts/
    tenant-leak-fuzzer.ts              ← leak harness
    db-setup-rls.ts                    ← runs rls/*.sql against DIRECT_URL
  tests/
    unit/ (existing + password, rate-limit, email, host-classifier, turnstile)
    integration/
      setup.ts                         ← two-tenant fixture + truncate helpers
      provisioning.test.ts
      claim.test.ts
      support.test.ts
      membership-guard.test.ts
      rls-policy.test.ts
    eslint/no-untenanted-query.test.js ← RuleTester
  .github/workflows/
    ci.yml                             ← + lint step
    nightly-fuzz.yml                   ← scheduled leak fuzz
  vitest.setup.ts                      ← dotenv load for integration tests
```

---

## Task 0: Branch, docs move, CI action bumps

**Files:**
- Create branch `feat/phase-1-skeleton` (worktree optional — controller's choice)
- Move (copy): program spec + Phase 0/1 plans from the FreedomGuard repo into `docs/superpowers/specs/` + `docs/superpowers/plans/`
- Modify: `.github/workflows/ci.yml` (action version bumps + lint step placeholder comes in Task 5)

- [ ] **Step 1: Create the branch**

```powershell
cd C:\Projects\platform
git checkout -b feat/phase-1-skeleton
```

- [ ] **Step 2: Copy the spec + plans from the FG repo**

```powershell
New-Item -ItemType Directory -Force docs\superpowers\specs | Out-Null
Copy-Item "C:\Projects\FreedomGuard\docs\superpowers\specs\2026-06-11-or9-space-platform-design.md" docs\superpowers\specs\
Copy-Item "C:\Projects\FreedomGuard\docs\superpowers\plans\2026-06-11-phase-0-platform-bootstrap.md" docs\superpowers\plans\
```

(This Phase 1 plan file is already in `docs/superpowers/plans/`.)

- [ ] **Step 3: Bump CI action versions**

In `.github/workflows/ci.yml` replace `actions/checkout@v4` → `actions/checkout@v5` and `actions/setup-node@v4` → `actions/setup-node@v5`. Leave `pnpm/action-setup@v4` (no v5 exists yet).

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "chore(phase1): branch start — spec/plan docs in-repo, CI action bumps"
```

---

## Task 1: Schema migration — lifecycle + support + config tables

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_phase1_lifecycle_support/migration.sql` (generated)
- Modify: `lib/db.ts` (GLOBAL_TABLES: `tenantConfig` → `tenantConfigOverride`)
- Modify: `tests/unit/db.test.ts` (no change needed — verify only)

- [ ] **Step 1: Append to `prisma/schema.prisma`**

Add `tier` to Membership, claim fields to Tenant, and the new models. Final additions:

```prisma
enum RankTier {
  ENLISTED
  NCO
  OFFICER
  COMMAND
}

enum PendingTenantStatus {
  PENDING
  APPROVED
  REJECTED
}

enum SupportTicketStatus {
  OPEN
  ANSWERED
  CLOSED
}

model PendingTenant {
  id             String              @id @default(cuid())
  slug           String              @db.VarChar(60)
  name           String              @db.VarChar(120)
  requestedEmail String              @map("requested_email") @db.VarChar(200)
  description    String              @db.VarChar(500)
  status         PendingTenantStatus @default(PENDING)
  createdAt      DateTime            @default(now()) @map("created_at")
  decidedAt      DateTime?           @map("decided_at")

  @@index([status, createdAt])
  @@map("pending_tenants")
}

model TenantConfigOverride {
  tenantId  String   @id @map("tenant_id")
  json      Json     @default("{}")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("tenant_config_overrides")
}

model TenantFeatureFlag {
  id       String  @id @default(cuid())
  tenantId String  @map("tenant_id")
  key      String  @db.VarChar(60)
  enabled  Boolean

  @@unique([tenantId, key])
  @@map("tenant_feature_flags")
}

model SupportTicket {
  id              String              @id @default(cuid())
  accountId       String              @map("account_id")
  tenantContextId String?             @map("tenant_context_id")
  subject         String              @db.VarChar(200)
  status          SupportTicketStatus @default(OPEN)
  createdAt       DateTime            @default(now()) @map("created_at")
  closedAt        DateTime?           @map("closed_at")

  account  Account          @relation(fields: [accountId], references: [id], onDelete: Cascade)
  messages SupportMessage[]

  @@index([status, createdAt])
  @@index([accountId])
  @@map("support_tickets")
}

model SupportMessage {
  id           String   @id @default(cuid())
  ticketId     String   @map("ticket_id")
  accountId    String   @map("account_id")
  body         String   @db.VarChar(5000)
  isAdminReply Boolean  @default(false) @map("is_admin_reply")
  createdAt    DateTime @default(now()) @map("created_at")

  ticket SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId, createdAt])
  @@map("support_messages")
}

model AuditLog {
  id             String   @id @default(cuid())
  tenantId       String   @map("tenant_id")
  actorAccountId String   @map("actor_account_id")
  action         String   @db.VarChar(80)
  detail         Json     @default("{}")
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([tenantId, createdAt])
  @@map("audit_logs")
}
```

Modify the existing `Tenant` model — add two fields before `memberships`:

```prisma
  founderClaimTokenHash String?   @map("founder_claim_token_hash") @db.VarChar(64)
  founderClaimExpiresAt DateTime? @map("founder_claim_expires_at")
```

Modify the existing `Membership` model — add after `displayName`:

```prisma
  tier RankTier @default(ENLISTED)
```

Modify the existing `Account` model — add relation after `memberships`:

```prisma
  supportTickets SupportTicket[]
```

- [ ] **Step 2: Migrate**

```powershell
pnpm exec prisma migrate dev --name phase1_lifecycle_support
```

Expected: new migration applied, "in sync".

- [ ] **Step 3: Update GLOBAL_TABLES in `lib/db.ts`**

Replace the entry `"tenantConfig"` with `"tenantConfigOverride"` in the `GLOBAL_TABLES` array. (`auditLog` is tenant-scoped — deliberately NOT whitelisted.)

- [ ] **Step 4: Run tests + typecheck**

```powershell
pnpm test
pnpm exec tsc --noEmit
```

Expected: 33 tests pass; tsc exit 0.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat(schema): phase 1 lifecycle, support, config-override, audit tables"
```

---

## Task 2: Host classifier (TDD)

**Files:**
- Create: `lib/host-classifier.ts`, `tests/unit/host-classifier.test.ts`
- Modify: `middleware.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/host-classifier.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { classifyHost } from "@/lib/host-classifier";

describe("classifyHost", () => {
  it("classifies tenant subdomains", () => {
    expect(classifyHost("demo.or9.space")).toEqual({ kind: "tenant", slug: "demo" });
    expect(classifyHost("freedomguards.or9.space:443")).toEqual({ kind: "tenant", slug: "freedomguards" });
  });

  it("classifies marketing root + www", () => {
    expect(classifyHost("or9.space")).toEqual({ kind: "marketing" });
    expect(classifyHost("www.or9.space")).toEqual({ kind: "marketing" });
  });

  it("classifies admin + support subdomains", () => {
    expect(classifyHost("admin.or9.space")).toEqual({ kind: "admin" });
    expect(classifyHost("support.or9.space")).toEqual({ kind: "support" });
  });

  it("classifies api as marketing (reserved, unrouted)", () => {
    expect(classifyHost("api.or9.space")).toEqual({ kind: "marketing" });
  });

  it("handles localhost dev", () => {
    expect(classifyHost("demo.localhost:3000")).toEqual({ kind: "tenant", slug: "demo" });
    expect(classifyHost("admin.localhost:3000")).toEqual({ kind: "admin" });
    expect(classifyHost("localhost:3000")).toEqual({ kind: "marketing" });
  });

  it("null/garbage hosts are marketing", () => {
    expect(classifyHost(null)).toEqual({ kind: "marketing" });
    expect(classifyHost("evil.example.com")).toEqual({ kind: "marketing" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test` — expect the new file FAILS (module not found), 33 prior pass.

- [ ] **Step 3: Implement `lib/host-classifier.ts`**

```ts
import { tenantSlugFromHost } from "./tenant-resolver";

export type HostClass =
  | { kind: "tenant"; slug: string }
  | { kind: "marketing" }
  | { kind: "admin" }
  | { kind: "support" };

const PLATFORM_ROOTS = ["or9.space", "localhost"];

function subdomainOf(host: string): string | null {
  const noPort = host.split(":")[0];
  for (const root of PLATFORM_ROOTS) {
    const suffix = "." + root;
    if (noPort.endsWith(suffix)) {
      const sub = noPort.slice(0, -suffix.length);
      if (sub && !sub.includes(".")) return sub;
    }
  }
  return null;
}

export function classifyHost(host: string | null | undefined): HostClass {
  if (!host) return { kind: "marketing" };
  const sub = subdomainOf(host);
  if (sub === "admin") return { kind: "admin" };
  if (sub === "support") return { kind: "support" };
  const slug = tenantSlugFromHost(host);
  if (slug) return { kind: "tenant", slug };
  return { kind: "marketing" };
}
```

- [ ] **Step 4: Run tests — all green**

`pnpm test` — new tests pass, total 39.

- [ ] **Step 5: Rewire `middleware.ts`**

Replace the whole file:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { classifyHost } from "@/lib/host-classifier";

export function middleware(req: NextRequest) {
  const cfTenant = req.headers.get("x-or9-tenant");
  const cls = classifyHost(req.headers.get("host"));

  if (cls.kind === "admin" || cls.kind === "support") {
    const url = req.nextUrl.clone();
    const prefix = cls.kind === "admin" ? "/_admin" : "/_support";
    // Don't double-rewrite API/auth routes
    if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith(prefix)) {
      url.pathname = `${prefix}${url.pathname === "/" ? "" : url.pathname}`;
      const res = NextResponse.rewrite(url);
      res.headers.set("x-or9-host-kind", cls.kind);
      return res;
    }
    const res = NextResponse.next();
    res.headers.set("x-or9-host-kind", cls.kind);
    return res;
  }

  const slug = cfTenant?.trim() || (cls.kind === "tenant" ? cls.slug : null);
  const requestHeaders = new Headers(req.headers);
  if (slug) requestHeaders.set("x-or9-tenant", slug);
  requestHeaders.set("x-or9-host-kind", cls.kind);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|api/health).*)",
};
```

NOTE the change: tenant slug now goes on the **request** headers (so server components read it via `headers()`) — Phase 0 set it on the response, which worked because `headers()` in Next reads incoming request headers and the Host fallback re-derived it; this makes it explicit and correct.

`lib/server/get-tenant.ts` keeps working unchanged (reads `x-or9-tenant` from request headers).

- [ ] **Step 6: Build + verify**

```powershell
pnpm build
pnpm test
```

Both green.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat(routing): host classifier + admin/support subdomain rewrites"
```

---

## Task 3: Integration test harness (real Postgres, two-tenant fixture)

**Files:**
- Create: `tests/integration/setup.ts`, `vitest.setup.ts`
- Modify: `vitest.config.ts`, `package.json`

- [ ] **Step 1: Create `vitest.setup.ts`** (repo root)

```ts
// Load .env so integration tests see DATABASE_URL when run locally.
// CI provides env vars directly; loadEnv is a no-op there.
import { config } from "dotenv";
config();
```

Install dotenv as a dev dependency:

```powershell
pnpm add -D dotenv
```

- [ ] **Step 2: Update `vitest.config.ts`**

Replace the `test` block:

```ts
  test: {
    environment: "happy-dom",
    globals: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 20000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules/", "tests/", "*.config.*"],
    },
  },
```

- [ ] **Step 3: Create `tests/integration/setup.ts`**

```ts
import { PrismaClient } from "@prisma/client";

/**
 * Integration test helpers. These run against the real Postgres named by
 * DATABASE_URL (.env locally → or9-pg container; CI → service container).
 * Each suite truncates the tables it touches between tests via resetDb().
 */
export const testPrisma = new PrismaClient();

export const TENANT_A = { id: "it-alpha", slug: "it-alpha", name: "Alpha Test Org" };
export const TENANT_B = { id: "it-bravo", slug: "it-bravo", name: "Bravo Test Org" };

export async function seedTwoTenants(): Promise<void> {
  for (const t of [TENANT_A, TENANT_B]) {
    await testPrisma.tenant.upsert({
      where: { slug: t.slug },
      update: { name: t.name, status: "LIVE", plan: "FREE" },
      create: { id: t.id, slug: t.slug, name: t.name, status: "LIVE", plan: "FREE" },
    });
  }
}

/** Order matters: children before parents. Only touches integration data. */
export async function resetDb(): Promise<void> {
  await testPrisma.supportMessage.deleteMany({});
  await testPrisma.supportTicket.deleteMany({});
  await testPrisma.auditLog.deleteMany({});
  await testPrisma.membership.deleteMany({});
  await testPrisma.account.deleteMany({ where: { email: { contains: "@it-test." } } });
  await testPrisma.pendingTenant.deleteMany({});
  await testPrisma.tenantConfigOverride.deleteMany({ where: { tenantId: { in: [TENANT_A.id, TENANT_B.id] } } });
  await testPrisma.tenant.deleteMany({ where: { slug: { startsWith: "it-" } } });
}

export async function closeDb(): Promise<void> {
  await testPrisma.$disconnect();
}
```

- [ ] **Step 4: Write a smoke integration test** to prove the harness works.

Create `tests/integration/harness.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

describe("integration harness", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTwoTenants();
  });
  afterAll(async () => {
    await resetDb();
    await closeDb();
  });

  it("seeds two distinct live tenants", async () => {
    const tenants = await testPrisma.tenant.findMany({
      where: { slug: { startsWith: "it-" } },
      orderBy: { slug: "asc" },
    });
    expect(tenants.map((t) => t.slug)).toEqual([TENANT_A.slug, TENANT_B.slug]);
    expect(tenants.every((t) => t.status === "LIVE")).toBe(true);
  });
});
```

- [ ] **Step 5: Run + verify**

```powershell
pnpm test
```

All green (prior 39 + harness test). Requires `or9-pg` container running — if connection refused, report BLOCKED.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "test(integration): real-Postgres harness with two-tenant fixture"
```

---

## Task 4: RLS — roles, policies, client extension, policy tester

**Files:**
- Create: `prisma/rls/setup-roles.sql`, `prisma/rls/policies.sql`, `scripts/db-setup-rls.ts`, `lib/rls.ts`, `tests/integration/rls-policy.test.ts`
- Modify: `package.json` (script), `docs/self-host.md` (RLS section)

- [ ] **Step 1: Write `prisma/rls/setup-roles.sql`**

```sql
-- Creates the runtime application role. Run as a superuser via
-- `pnpm db:setup-rls` after migrations. Idempotent.
-- The app's DATABASE_URL should authenticate as app_user in production;
-- migrations keep using the superuser (DIRECT_URL).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    EXECUTE format('CREATE ROLE app_user LOGIN PASSWORD %L', current_setting('app.bootstrap_password', true));
  END IF;
END
$$;

GRANT CONNECT ON DATABASE CURRENT_DATABASE TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
```

NOTE: `GRANT CONNECT ON DATABASE CURRENT_DATABASE` is not valid SQL — the setup script (Step 3) substitutes the actual database name before executing. The file contains the literal placeholder `CURRENT_DATABASE`.

- [ ] **Step 2: Write `prisma/rls/policies.sql`**

```sql
-- Tenant-isolation RLS. Applied to every tenant-scoped table.
-- FORCE means even the table owner obeys (only superuser/BYPASSRLS skips).
-- app.tenant_id is set per-operation by lib/rls.ts via set_config(..., true)
-- (transaction-local). An unset/empty setting matches no rows.

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON memberships;
CREATE POLICY tenant_isolation ON memberships
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
CREATE POLICY tenant_isolation ON audit_logs
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
```

(Phase 3 adds each ported table here — one stanza per table, same template.)

- [ ] **Step 3: Write `scripts/db-setup-rls.ts`**

```ts
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

/**
 * Applies RLS roles + policies. Run with a superuser connection:
 *   APP_USER_PASSWORD=<pw> pnpm db:setup-rls
 * Uses DIRECT_URL (superuser). Idempotent.
 */
async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL required");
  const dbName = new URL(url).pathname.replace("/", "").split("?")[0];
  const appPassword = process.env.APP_USER_PASSWORD;

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    if (appPassword) {
      await prisma.$executeRawUnsafe(
        `SELECT set_config('app.bootstrap_password', '${appPassword.replace(/'/g, "''")}', false)`,
      );
    }
    const rolesSql = fs
      .readFileSync(path.join(process.cwd(), "prisma", "rls", "setup-roles.sql"), "utf8")
      .replace(/CURRENT_DATABASE/g, `"${dbName}"`);
    const policiesSql = fs.readFileSync(path.join(process.cwd(), "prisma", "rls", "policies.sql"), "utf8");

    for (const block of splitSql(rolesSql)) await prisma.$executeRawUnsafe(block);
    for (const block of splitSql(policiesSql)) await prisma.$executeRawUnsafe(block);
    console.log("RLS roles + policies applied");
  } finally {
    await prisma.$disconnect();
  }
}

/** Split on semicolons at top level; keep $$..$$ bodies intact. */
function splitSql(sql: string): string[] {
  const blocks: string[] = [];
  let current = "";
  let inDollar = false;
  for (const line of sql.split("\n")) {
    if (line.trim().startsWith("--")) continue;
    if (line.includes("$$")) inDollar = !inDollar;
    current += line + "\n";
    if (!inDollar && line.trimEnd().endsWith(";")) {
      const stmt = current.trim();
      if (stmt.length > 1) blocks.push(stmt);
      current = "";
    }
  }
  if (current.trim()) blocks.push(current.trim());
  return blocks;
}

main();
```

Add to `package.json` scripts:

```json
"db:setup-rls": "tsx scripts/db-setup-rls.ts"
```

- [ ] **Step 4: Write `lib/rls.ts`** — the per-operation tenant context extension

```ts
import { PrismaClient } from "@prisma/client";

/**
 * Wraps every operation of a PrismaClient in a transaction that sets the
 * transaction-local `app.tenant_id` setting. RLS policies key off it.
 * This is the official Prisma RLS recipe (client extension + set_config).
 *
 * Used by lib/db.ts when RLS_ENABLED=1 (production: app connects as the
 * non-BYPASSRLS role app_user). In dev against a superuser connection the
 * policies don't bite, but the extension is still exercised.
 */
export function withTenantRls(prisma: PrismaClient, tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
}
```

- [ ] **Step 5: Wire into `lib/db.ts`**

Modify `db(ctx)`: when `process.env.RLS_ENABLED === "1"`, the proxy targets `withTenantRls(prisma, ctx.tenantId)` instead of the bare client. Replace the `db` function:

```ts
import { withTenantRls } from "./rls";

export function db(ctx: TenantContext) {
  const target = process.env.RLS_ENABLED === "1" ? withTenantRls(prisma, ctx.tenantId) : prisma;
  return new Proxy(target as any, {
    get(t, modelKey: ModelName) {
      const model = t[modelKey];
      if (!model || typeof model !== "object") return model;
      const isGlobal = (GLOBAL_TABLES as readonly string[]).includes(modelKey);
      if (isGlobal) return model;
      return new Proxy(model, {
        get(modelTarget, opKey: Operation) {
          const opFn = (modelTarget as any)[opKey];
          if (typeof opFn !== "function") return opFn;
          return (args: Record<string, unknown> | undefined) =>
            opFn(injectTenantId(opKey, args, ctx.tenantId));
        },
      });
    },
  }) as PrismaClient;
}
```

(Keep the import at top of file with the others. Existing unit tests still pass because RLS_ENABLED is unset under vitest.)

- [ ] **Step 6: Write the RLS policy tester**

Create `tests/integration/rls-policy.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

/**
 * Proves the RLS policies actually isolate rows for a non-BYPASSRLS role.
 * Creates a throwaway role, applies setup scripts, connects as that role,
 * and asserts cross-tenant reads return nothing.
 */
const RLS_TEST_PASSWORD = "rls-test-password-1";

function adminUrl(): string {
  return process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
}

function appUserUrl(): string {
  const u = new URL(adminUrl());
  u.username = "app_user";
  u.password = RLS_TEST_PASSWORD;
  return u.toString();
}

describe("RLS tenant isolation (app_user role)", () => {
  let appClient: PrismaClient;

  beforeAll(async () => {
    execSync("pnpm db:setup-rls", {
      env: { ...process.env, APP_USER_PASSWORD: RLS_TEST_PASSWORD },
      stdio: "pipe",
    });
    // Ensure the password matches even if the role pre-existed.
    await testPrisma.$executeRawUnsafe(
      `ALTER ROLE app_user LOGIN PASSWORD '${RLS_TEST_PASSWORD}'`,
    );
    await resetDb();
    await seedTwoTenants();
    const acc = await testPrisma.account.create({
      data: { email: "rls@it-test.example", displayName: "RLS Probe" },
    });
    await testPrisma.membership.createMany({
      data: [
        { accountId: acc.id, tenantId: TENANT_A.id, username: "alpha-user" },
        { accountId: acc.id, tenantId: TENANT_B.id, username: "bravo-user" },
      ],
    });
    appClient = new PrismaClient({ datasources: { db: { url: appUserUrl() } } });
  }, 60000);

  afterAll(async () => {
    await appClient?.$disconnect();
    await resetDb();
    await closeDb();
  });

  it("sees only tenant A rows when app.tenant_id = A", async () => {
    const [, rows] = await appClient.$transaction([
      appClient.$executeRaw`SELECT set_config('app.tenant_id', ${TENANT_A.id}, TRUE)`,
      appClient.membership.findMany({}),
    ]);
    expect(rows.length).toBe(1);
    expect(rows[0].tenantId).toBe(TENANT_A.id);
  });

  it("sees nothing when app.tenant_id is unset", async () => {
    const rows = await appClient.membership.findMany({});
    expect(rows.length).toBe(0);
  });

  it("cannot insert a row for another tenant (WITH CHECK)", async () => {
    const acc = await testPrisma.account.create({
      data: { email: "rls2@it-test.example" },
    });
    await expect(
      appClient.$transaction([
        appClient.$executeRaw`SELECT set_config('app.tenant_id', ${TENANT_A.id}, TRUE)`,
        appClient.membership.create({
          data: { accountId: acc.id, tenantId: TENANT_B.id, username: "smuggled" },
        }),
      ]),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 7: Run + verify**

```powershell
pnpm test
```

All green (local or9-pg superuser is `postgres`, so the tester creates `app_user` itself). If `pnpm db:setup-rls` errors on the DO block, fix `splitSql`.

- [ ] **Step 8: Document in `docs/self-host.md`** — append:

```md
## Row-level security (production)

After running migrations, apply RLS roles + policies:

```sh
APP_USER_PASSWORD=<strong-password> pnpm db:setup-rls
```

Then point the app's `DATABASE_URL` at the `app_user` role and set `RLS_ENABLED=1`.
Keep `DIRECT_URL` on the superuser/owner role for migrations.
```

- [ ] **Step 9: Commit**

```powershell
git add -A
git commit -m "feat(rls): app_user role, forced tenant policies, client extension, policy tester"
```

---

## Task 5: ESLint flat config + no-untenanted-query rule

**Files:**
- Create: `eslint.config.mjs`, `eslint-rules/no-untenanted-query.js`, `tests/eslint/no-untenanted-query.test.js`
- Modify: `package.json` (lint script), `.github/workflows/ci.yml` (lint step)

- [ ] **Step 1: Install ESLint 9**

```powershell
pnpm add -D eslint @eslint/js typescript-eslint
```

- [ ] **Step 2: Write the custom rule** `eslint-rules/no-untenanted-query.js`:

```js
/**
 * Forbids untenanted Prisma access outside sanctioned files:
 *  1. Importing @prisma/client anywhere except lib/db.ts, lib/rls.ts,
 *     scripts/**, tests/**, prisma/**.
 *  2. prismaGlobal.<model>.<op> where <model> is not in the GLOBAL_TABLES
 *     whitelist (mirrored here; lib/db.ts is the source of truth).
 */
const GLOBAL_TABLES = [
  "account",
  "accountOauth",
  "tenant",
  "pendingTenant",
  "tenantConfigOverride",
  "tenantFeatureFlag",
  "supportTicket",
  "supportMessage",
  "adSlot",
  "adCreative",
];

const PRISMA_VERBS = new Set([
  "findMany", "findFirst", "findUnique", "findUniqueOrThrow", "findFirstOrThrow",
  "count", "aggregate", "groupBy",
  "create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany",
]);

const SANCTIONED_IMPORT = /(?:^|[\\/])(lib[\\/](?:db|rls)\.ts|scripts[\\/]|tests[\\/]|prisma[\\/]|vitest\.setup\.ts)/;

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Tenant-scoped Prisma access must go through db(ctx)" },
    messages: {
      noDirectImport:
        "Import @prisma/client only in lib/db.ts, lib/rls.ts, scripts/, tests/, prisma/. App code must use db(ctx) from @/lib/db.",
      noTenantedGlobal:
        "prismaGlobal.{{model}} is tenant-scoped. Use db(ctx).{{model}} so tenant_id is enforced.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    const sanctioned = SANCTIONED_IMPORT.test(filename);

    return {
      ImportDeclaration(node) {
        if (sanctioned) return;
        if (node.source.value === "@prisma/client") {
          context.report({ node, messageId: "noDirectImport" });
        }
      },
      MemberExpression(node) {
        // matches prismaGlobal.<model>.<verb>
        if (
          node.object?.type === "MemberExpression" &&
          node.object.object?.type === "Identifier" &&
          node.object.object.name === "prismaGlobal" &&
          node.object.property?.type === "Identifier" &&
          node.property?.type === "Identifier" &&
          PRISMA_VERBS.has(node.property.name)
        ) {
          const model = node.object.property.name;
          if (!GLOBAL_TABLES.includes(model)) {
            context.report({ node, messageId: "noTenantedGlobal", data: { model } });
          }
        }
      },
    };
  },
};
```

- [ ] **Step 3: Write the RuleTester test** `tests/eslint/no-untenanted-query.test.js`:

```js
const { RuleTester } = require("eslint");
const rule = require("../../eslint-rules/no-untenanted-query.js");

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

tester.run("no-untenanted-query", rule, {
  valid: [
    { code: `import { PrismaClient } from "@prisma/client";`, filename: "lib/db.ts" },
    { code: `import { PrismaClient } from "@prisma/client";`, filename: "scripts/seed.ts" },
    { code: `prismaGlobal.tenant.findUnique({ where: { slug } });`, filename: "lib/server/get-tenant.ts" },
    { code: `prismaGlobal.supportTicket.findMany({});`, filename: "lib/actions/support.ts" },
    { code: `db(ctx).membership.findMany({});`, filename: "lib/actions/anything.ts" },
  ],
  invalid: [
    {
      code: `import { PrismaClient } from "@prisma/client";`,
      filename: "lib/actions/forums.ts",
      errors: [{ messageId: "noDirectImport" }],
    },
    {
      code: `prismaGlobal.membership.findMany({});`,
      filename: "lib/actions/anything.ts",
      errors: [{ messageId: "noTenantedGlobal" }],
    },
    {
      code: `prismaGlobal.auditLog.create({ data: {} });`,
      filename: "app/page.tsx",
      errors: [{ messageId: "noTenantedGlobal" }],
    },
  ],
});

console.log("no-untenanted-query: all RuleTester cases passed");
```

- [ ] **Step 4: Write `eslint.config.mjs`**

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import noUntenantedQuery from "./eslint-rules/no-untenanted-query.js";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      or9: { rules: { "no-untenanted-query": noUntenantedQuery } },
    },
    rules: {
      "or9/no-untenanted-query": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
```

NOTE: the rule file uses `module.exports` (CJS) — if `eslint.config.mjs` import fails on it, rename the rule file to `no-untenanted-query.cjs` and update both the config import and the RuleTester require. Report which variant worked.

- [ ] **Step 5: Update scripts + run**

In `package.json`: `"lint": "eslint ."` and add `"lint:rule-test": "node tests/eslint/no-untenanted-query.test.js"`.

```powershell
pnpm lint:rule-test
pnpm lint
```

Rule test prints success line. `pnpm lint` must exit 0 on the current codebase (fix any incidental violations it finds — expected none; `lib/server/get-tenant.ts` uses prismaGlobal.tenant which is whitelisted).

- [ ] **Step 6: Add lint to CI** — in `.github/workflows/ci.yml` after the Typecheck step:

```yaml
      - name: Lint
        run: pnpm lint && pnpm lint:rule-test
```

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat(lint): ESLint 9 flat config + no-untenanted-query custom rule in CI"
```

---

## Task 6: Rate limiter (TDD)

**Files:**
- Create: `lib/rate-limit.ts`, `tests/unit/rate-limit.test.ts`

- [ ] **Step 1: Failing test** `tests/unit/rate-limit.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, _resetRateLimitStore } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetRateLimitStore();
  });
  afterEach(() => vi.useRealTimers());

  it("allows up to max requests in window", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("k", 5, 60_000).allowed).toBe(true);
    }
    expect(checkRateLimit("k", 5, 60_000).allowed).toBe(false);
  });

  it("separates keys", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("a", 5, 60_000);
    expect(checkRateLimit("a", 5, 60_000).allowed).toBe(false);
    expect(checkRateLimit("b", 5, 60_000).allowed).toBe(true);
  });

  it("window slides", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("k", 5, 60_000);
    expect(checkRateLimit("k", 5, 60_000).allowed).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit("k", 5, 60_000).allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run — fails (module not found).**

- [ ] **Step 3: Implement `lib/rate-limit.ts`**

```ts
/**
 * In-memory sliding-window rate limiter. Single-instance only (Phase 1 —
 * one VPS, one Node process). Swap for a Postgres/Redis-backed limiter
 * when the app scales horizontally.
 */
type Entry = number[]; // timestamps (ms) of accepted hits

let store = new Map<string, Entry>();

export const CONTENT_LIMIT = { maxRequests: 10, windowMs: 60_000 };
export const SUPPORT_TICKET_LIMIT = { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 };
export const SIGNUP_LIMIT = { maxRequests: 3, windowMs: 60 * 60 * 1000 };

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= maxRequests) {
    store.set(key, hits);
    return { allowed: false, remaining: 0 };
  }
  hits.push(now);
  store.set(key, hits);
  return { allowed: true, remaining: maxRequests - hits.length };
}

/** Test hook. */
export function _resetRateLimitStore(): void {
  store = new Map();
}
```

- [ ] **Step 4: Run — green. Step 5: Commit**

```powershell
pnpm test
git add -A
git commit -m "feat(rate-limit): in-memory sliding window limiter"
```

---

## Task 7: Email wrapper (TDD, env-gated Resend)

**Files:**
- Create: `lib/email.ts`, `tests/unit/email.test.ts`

- [ ] **Step 1: Failing test** `tests/unit/email.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail, _setEmailTransportForTests } from "@/lib/email";

describe("sendEmail", () => {
  beforeEach(() => _setEmailTransportForTests(null));

  it("falls back to console logging when no transport (no RESEND_API_KEY)", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendEmail({ to: "x@example.com", subject: "Hi", text: "Body" });
    expect(result.delivered).toBe(false);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("EMAIL (console fallback)"), expect.anything());
    spy.mockRestore();
  });

  it("uses the injected transport when present", async () => {
    const fake = vi.fn(async () => ({ id: "msg_1" }));
    _setEmailTransportForTests(fake);
    const result = await sendEmail({ to: "x@example.com", subject: "Hi", text: "Body" });
    expect(result.delivered).toBe(true);
    expect(fake).toHaveBeenCalledWith({
      from: expect.any(String),
      to: "x@example.com",
      subject: "Hi",
      text: "Body",
    });
  });
});
```

- [ ] **Step 2: Run — fails. Step 3: Implement `lib/email.ts`**

```ts
/**
 * Transactional email. Uses Resend when RESEND_API_KEY is set; otherwise
 * logs to console so dev + self-host work with zero external accounts.
 * Resend is called over plain fetch — no SDK dependency.
 */
export interface EmailInput {
  to: string;
  subject: string;
  text: string;
}

type Transport = (msg: EmailInput & { from: string }) => Promise<{ id: string }>;

let transportOverride: Transport | null = null;

function resendTransport(apiKey: string): Transport {
  return async (msg) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return (await res.json()) as { id: string };
  };
}

export async function sendEmail(input: EmailInput): Promise<{ delivered: boolean }> {
  const from = process.env.RESEND_FROM_EMAIL ?? "hello@or9.space";
  const transport =
    transportOverride ??
    (process.env.RESEND_API_KEY ? resendTransport(process.env.RESEND_API_KEY) : null);
  if (!transport) {
    console.log("EMAIL (console fallback)", { from, ...input });
    return { delivered: false };
  }
  await transport({ from, ...input });
  return { delivered: true };
}

/** Test hook. */
export function _setEmailTransportForTests(t: Transport | null): void {
  transportOverride = t;
}
```

- [ ] **Step 4: Run — green. Step 5: Commit**

```powershell
pnpm test
git add -A
git commit -m "feat(email): env-gated Resend wrapper with console fallback"
```

---

## Task 8: Turnstile verify (TDD, env-gated)

**Files:**
- Create: `lib/turnstile.ts`, `tests/unit/turnstile.test.ts`

- [ ] **Step 1: Failing test** `tests/unit/turnstile.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyTurnstile } from "@/lib/turnstile";

describe("verifyTurnstile", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => { delete process.env.TURNSTILE_SECRET; });
  afterEach(() => { globalThis.fetch = realFetch; });

  it("passes open when TURNSTILE_SECRET is unset", async () => {
    expect(await verifyTurnstile("any-token")).toBe(true);
  });

  it("verifies with Cloudflare when secret present", async () => {
    process.env.TURNSTILE_SECRET = "sec";
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    ) as any;
    expect(await verifyTurnstile("tok")).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects when Cloudflare says no", async () => {
    process.env.TURNSTILE_SECRET = "sec";
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    ) as any;
    expect(await verifyTurnstile("tok")).toBe(false);
  });
});
```

- [ ] **Step 2: Run — fails. Step 3: Implement `lib/turnstile.ts`**

```ts
/**
 * Cloudflare Turnstile verification. Env-gated: without TURNSTILE_SECRET
 * the check passes open (dev / self-host without captcha).
 */
export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
```

- [ ] **Step 4: Run — green. Step 5: Commit**

```powershell
pnpm test
git add -A
git commit -m "feat(captcha): env-gated Turnstile verification"
```

---

## Task 9: Password hashing (TDD) + NextAuth credentials

**Files:**
- Create: `lib/password.ts`, `tests/unit/password.test.ts`, `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Install deps**

```powershell
pnpm add next-auth@beta bcryptjs
pnpm add -D @types/bcryptjs
```

Report the resolved next-auth version (expect 5.0.0-beta.x).

- [ ] **Step 2: Failing test** `tests/unit/password.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("hunter2hunter2");
    expect(hash).not.toContain("hunter2");
    expect(await verifyPassword("hunter2hunter2", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("rejects passwords under 10 chars at hash time", async () => {
    await expect(hashPassword("short")).rejects.toThrow(/at least 10/);
  });
});
```

- [ ] **Step 3: Run — fails. Step 4: Implement `lib/password.ts`**

```ts
import bcrypt from "bcryptjs";

const MIN_LENGTH = 10;
const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < MIN_LENGTH) {
    throw new Error(`Password must be at least ${MIN_LENGTH} characters`);
  }
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 5: Run — green.**

- [ ] **Step 6: Implement `lib/auth.ts`**

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prismaGlobal } from "./db";
import { verifyPassword } from "./password";

/**
 * NextAuth 5, JWT sessions, credentials only (Discord OAuth lands in
 * Phase 1.5 with the auth.or9.space broker). Session carries the GLOBAL
 * accountId; per-tenant membership is resolved per request server-side.
 * Cookies are host-only → each tenant subdomain is its own session,
 * which matches the Q13 per-tenant-accounts decision.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const account = await prismaGlobal.account.findUnique({ where: { email } });
        if (!account?.passwordHash) return null;
        const ok = await verifyPassword(password, account.passwordHash);
        if (!ok) return null;
        return { id: account.id, email: account.email, name: account.displayName };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.accountId = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.accountId) (session as any).accountId = token.accountId as string;
      return session;
    },
  },
});

/** Convenience: the signed-in global account id, or null. */
export async function getSessionAccountId(): Promise<string | null> {
  const session = await auth();
  return ((session as any)?.accountId as string | undefined) ?? null;
}
```

- [ ] **Step 7: Create `app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 8: Set env + build**

Append to `.env` (and `.env.example` already has these keys):

```
NEXTAUTH_SECRET=dev-secret-change-me-0123456789abcdef
NEXTAUTH_URL=http://localhost:3000
```

NextAuth 5 also reads `AUTH_SECRET` — add `AUTH_SECRET` with the same value to `.env` AND add an `AUTH_SECRET=""` line to `.env.example`.

```powershell
pnpm build
pnpm test
pnpm lint
```

All green. The middleware matcher excludes `api/health` only — NextAuth routes pass through the middleware harmlessly (no tenant header needed).

- [ ] **Step 9: Commit**

```powershell
git add -A
git commit -m "feat(auth): NextAuth 5 credentials + bcrypt password helpers"
```

---

## Task 10: Register/login pages + membership guard (integration TDD)

**Files:**
- Create: `lib/actions/register.ts`, `tests/integration/membership-guard.test.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/auth-form.tsx`

- [ ] **Step 1: Failing integration test** `tests/integration/membership-guard.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { registerAccountWithMembership } from "@/lib/actions/register";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

describe("registerAccountWithMembership", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTwoTenants();
  });
  afterAll(async () => {
    await resetDb();
    await closeDb();
  });

  it("creates account + ENLISTED membership", async () => {
    const result = await registerAccountWithMembership({
      tenantId: TENANT_A.id,
      email: "joe@it-test.example",
      password: "longenoughpw",
      username: "joe",
    });
    expect(result.ok).toBe(true);
    const m = await testPrisma.membership.findFirst({ where: { username: "joe" } });
    expect(m?.tenantId).toBe(TENANT_A.id);
    expect(m?.tier).toBe("ENLISTED");
  });

  it("rejects a second membership for the same account (Q13 v1 guard)", async () => {
    await registerAccountWithMembership({
      tenantId: TENANT_A.id, email: "joe@it-test.example", password: "longenoughpw", username: "joe",
    });
    const second = await registerAccountWithMembership({
      tenantId: TENANT_B.id, email: "joe@it-test.example", password: "longenoughpw", username: "joe2",
    });
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/already a member/i);
  });

  it("rejects duplicate username within a tenant", async () => {
    await registerAccountWithMembership({
      tenantId: TENANT_A.id, email: "a@it-test.example", password: "longenoughpw", username: "samename",
    });
    const dup = await registerAccountWithMembership({
      tenantId: TENANT_A.id, email: "b@it-test.example", password: "longenoughpw", username: "samename",
    });
    expect(dup.ok).toBe(false);
    expect(dup.error).toMatch(/username/i);
  });

  it("rejects invalid email / short password / bad username", async () => {
    const bad = await registerAccountWithMembership({
      tenantId: TENANT_A.id, email: "not-an-email", password: "longenoughpw", username: "x",
    });
    expect(bad.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run — fails. Step 3: Implement `lib/actions/register.ts`**

```ts
"use server";

import { z } from "zod";
import { prismaGlobal } from "../db";
import { hashPassword } from "../password";
import { checkRateLimit, SIGNUP_LIMIT } from "../rate-limit";

const RegisterSchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
  username: z.string().regex(/^[a-zA-Z0-9_.-]{2,32}$/),
});

export type RegisterResult = { ok: true; accountId: string } | { ok: false; error: string };

export async function registerAccountWithMembership(
  input: z.infer<typeof RegisterSchema>,
): Promise<RegisterResult> {
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { tenantId, email, password, username } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const { allowed } = checkRateLimit(
    `register:${normalizedEmail}`,
    SIGNUP_LIMIT.maxRequests,
    SIGNUP_LIMIT.windowMs,
  );
  if (!allowed) return { ok: false, error: "Too many attempts — try again later" };

  const tenant = await prismaGlobal.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status !== "LIVE") return { ok: false, error: "Org not found" };

  try {
    const accountId = await prismaGlobal.$transaction(async (tx) => {
      const existing = await tx.account.findUnique({
        where: { email: normalizedEmail },
        include: { memberships: { select: { id: true } } },
      });
      if (existing) {
        // Q13 v1: one membership per account, app-layer guard.
        if (existing.memberships.length > 0) {
          throw new GuardError("This email is already a member of an org on or9.space");
        }
        if (!existing.passwordHash) {
          throw new GuardError("Account exists without a password — contact support");
        }
      }
      const usernameTaken = await tx.membership.findUnique({
        where: { tenantId_username: { tenantId, username } },
      });
      if (usernameTaken) throw new GuardError("That username is taken in this org");

      const account =
        existing ??
        (await tx.account.create({
          data: { email: normalizedEmail, passwordHash: await hashPassword(password) },
        }));
      await tx.membership.create({
        data: { accountId: account.id, tenantId, username, tier: "ENLISTED" },
      });
      return account.id;
    });
    return { ok: true, accountId };
  } catch (e) {
    if (e instanceof GuardError) return { ok: false, error: e.message };
    throw e;
  }
}

class GuardError extends Error {}
```

NOTE: `tenantId_username` is Prisma's generated name for the `@@unique([tenantId, username])` constraint. `prismaGlobal.$transaction` and `membership` access inside `tx` is sanctioned here — this file may need an eslint-disable for the rule if it flags `tx.membership` (it won't — the rule only matches `prismaGlobal.<model>`; but `prismaGlobal.$transaction` containing membership writes is the registration special case: account creation is global, membership creation is the bootstrap write. Add one targeted disable comment IF the linter flags it, with a comment explaining why).

- [ ] **Step 4: Run — green (integration). Step 5: Login/register UI.**

Create `app/(auth)/auth-form.tsx` (client component shared by both pages):

```tsx
"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";

export function AuthForm({
  mode,
  tenantName,
  registerAction,
}: {
  mode: "login" | "register";
  tenantName: string;
  registerAction?: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      if (mode === "register" && registerAction) {
        const result = await registerAction(formData);
        if (!result.ok) {
          setError(result.error ?? "Registration failed");
          return;
        }
      }
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError(mode === "login" ? "Invalid email or password" : "Registered — but sign-in failed; try logging in");
        return;
      }
      window.location.href = "/";
    });
  }

  return (
    <form action={handleSubmit} className="mx-auto mt-16 w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">
        {mode === "login" ? `Sign in to ${tenantName}` : `Join ${tenantName}`}
      </h1>
      {error && <p className="rounded border border-red-800 bg-red-950 p-2 text-sm text-red-300">{error}</p>}
      {mode === "register" && (
        <input name="username" required placeholder="Username" autoComplete="username"
          className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      )}
      <input name="email" type="email" required placeholder="Email" autoComplete="email"
        className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <input name="password" type="password" required placeholder="Password (10+ chars)"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <button type="submit" disabled={pending} aria-busy={pending}
        className="w-full rounded bg-neutral-100 p-2 font-semibold text-neutral-900 disabled:opacity-50">
        {pending ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-sm text-neutral-400">
        {mode === "login" ? <a href="/register" className="underline">Need an account?</a>
                          : <a href="/login" className="underline">Already a member?</a>}
      </p>
    </form>
  );
}
```

Create `app/(auth)/register/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/server/get-tenant";
import { registerAccountWithMembership } from "@/lib/actions/register";
import { AuthForm } from "../auth-form";

export default async function RegisterPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound(); // register only exists on tenant hosts

  async function registerAction(formData: FormData) {
    "use server";
    return await registerAccountWithMembership({
      tenantId: tenant!.id,
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      username: String(formData.get("username") ?? ""),
    });
  }

  return <AuthForm mode="register" tenantName={tenant.name} registerAction={registerAction} />;
}
```

Create `app/(auth)/login/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/server/get-tenant";
import { AuthForm } from "../auth-form";

export default async function LoginPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();
  return <AuthForm mode="login" tenantName={tenant.name} />;
}
```

- [ ] **Step 6: Build + full gates**

```powershell
pnpm build
pnpm test
pnpm lint
pnpm exec tsc --noEmit
```

All green.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat(auth): register/login pages + one-membership-per-account guard"
```

---

## Task 11: Platform admin gate (TDD)

**Files:**
- Create: `lib/platform-admin.ts`, `tests/unit/platform-admin.test.ts`, `app/_admin/layout.tsx`, `app/_admin/page.tsx`

- [ ] **Step 1: Failing test** `tests/unit/platform-admin.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

describe("isPlatformAdminEmail", () => {
  beforeEach(() => { process.env.PLATFORM_ADMIN_EMAILS = "dsmereski@gmail.com, second@x.io"; });

  it("matches listed emails case-insensitively", () => {
    expect(isPlatformAdminEmail("DSmereski@Gmail.com")).toBe(true);
    expect(isPlatformAdminEmail("second@x.io")).toBe(true);
  });

  it("rejects others and empty", () => {
    expect(isPlatformAdminEmail("rando@x.io")).toBe(false);
    expect(isPlatformAdminEmail(null)).toBe(false);
  });

  it("empty env = nobody is admin", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "";
    expect(isPlatformAdminEmail("dsmereski@gmail.com")).toBe(false);
  });
});
```

- [ ] **Step 2: Run — fails. Step 3: Implement `lib/platform-admin.ts`**

```ts
import { auth } from "./auth";
import { prismaGlobal } from "./db";
import { ForbiddenError } from "./permissions";

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** Server-side gate for admin.or9.space. Throws ForbiddenError. */
export async function requirePlatformAdmin(): Promise<{ accountId: string; email: string }> {
  const session = await auth();
  const accountId = (session as any)?.accountId as string | undefined;
  if (!accountId) throw new ForbiddenError("Sign in required");
  const account = await prismaGlobal.account.findUnique({ where: { id: accountId } });
  if (!account || !isPlatformAdminEmail(account.email)) {
    throw new ForbiddenError("Platform admin only");
  }
  return { accountId: account.id, email: account.email };
}
```

- [ ] **Step 4: Run — green. Step 5: Admin shell.**

Create `app/_admin/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { prismaGlobal } from "@/lib/db";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const accountId = (session as any)?.accountId as string | undefined;
  const account = accountId
    ? await prismaGlobal.account.findUnique({ where: { id: accountId } })
    : null;

  if (!account || !isPlatformAdminEmail(account.email)) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-2xl font-bold">or9.space admin</h1>
          <p className="text-neutral-400">
            Platform admin only. Sign in on a tenant subdomain with an admin account first
            — admin sessions are host-scoped, so use the email/password login at
            <code className="mx-1">admin.or9.space/login-direct</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800 p-4">
        <nav className="flex gap-6 text-sm">
          <a href="/" className="font-bold">or9 admin</a>
          <a href="/tenants/pending" className="text-neutral-400 hover:text-neutral-100">Pending tenants</a>
          <a href="/support" className="text-neutral-400 hover:text-neutral-100">Support</a>
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

ALSO create `app/_admin/login-direct/page.tsx` — admin sessions are cookie-host-scoped to admin.or9.space, so the admin needs a login ON that host:

```tsx
import { AuthForm } from "@/app/(auth)/auth-form";

export default function AdminLoginPage() {
  return <AuthForm mode="login" tenantName="or9.space admin" />;
}
```

Create `app/_admin/page.tsx`:

```tsx
import { prismaGlobal } from "@/lib/db";

export default async function AdminHome() {
  const [pendingCount, tenantCount, openTickets] = await Promise.all([
    prismaGlobal.pendingTenant.count({ where: { status: "PENDING" } }),
    prismaGlobal.tenant.count({ where: { status: "LIVE" } }),
    prismaGlobal.supportTicket.count({ where: { status: "OPEN" } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Platform overview</h1>
      <ul className="space-y-1 text-neutral-300">
        <li>Live tenants: {tenantCount}</li>
        <li><a className="underline" href="/tenants/pending">Pending sign-ups: {pendingCount}</a></li>
        <li><a className="underline" href="/support">Open support tickets: {openTickets}</a></li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: Gates + commit**

```powershell
pnpm build; pnpm test; pnpm lint
git add -A
git commit -m "feat(admin): platform-admin gate + admin shell on admin subdomain"
```

---

## Task 12: Public signup flow — /start-org (TDD)

**Files:**
- Create: `lib/actions/signup.ts`, `tests/integration/signup.test.ts`, `app/start-org/page.tsx`, `app/start-org/signup-form.tsx`

- [ ] **Step 1: Failing integration test** `tests/integration/signup.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createPendingTenant } from "@/lib/actions/signup";
import { testPrisma, resetDb, closeDb, seedTwoTenants, TENANT_A } from "./setup";
import { _resetRateLimitStore } from "@/lib/rate-limit";

describe("createPendingTenant", () => {
  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("creates a pending row for a valid request", async () => {
    const r = await createPendingTenant({
      slug: "it-newcrew", name: "New Crew", email: "boss@it-test.example",
      description: "We mine rocks.", turnstileToken: null,
    });
    expect(r.ok).toBe(true);
    const row = await testPrisma.pendingTenant.findFirst({ where: { slug: "it-newcrew" } });
    expect(row?.status).toBe("PENDING");
  });

  it("rejects a slug already taken by a live tenant", async () => {
    const r = await createPendingTenant({
      slug: TENANT_A.slug, name: "X", email: "x@it-test.example",
      description: "d", turnstileToken: null,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/taken/i);
  });

  it("rejects reserved slugs", async () => {
    for (const slug of ["admin", "support", "www", "api"]) {
      const r = await createPendingTenant({
        slug, name: "X", email: "x@it-test.example", description: "d", turnstileToken: null,
      });
      expect(r.ok).toBe(false);
    }
  });

  it("rejects malformed slugs", async () => {
    const r = await createPendingTenant({
      slug: "Bad_Slug!", name: "X", email: "x@it-test.example", description: "d", turnstileToken: null,
    });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run — fails. Step 3: Implement `lib/actions/signup.ts`**

```ts
"use server";

import { z } from "zod";
import { prismaGlobal } from "../db";
import { checkRateLimit, SIGNUP_LIMIT } from "../rate-limit";
import { verifyTurnstile } from "../turnstile";
import { sendEmail } from "../email";

const RESERVED_SLUGS = new Set(["www", "admin", "support", "api", "demo-staging", "auth", "mail", "blog"]);

const SignupSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9-]{2,40}$/, "Slug: lowercase letters, digits, dashes; 3-41 chars"),
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  description: z.string().min(2).max(500),
  turnstileToken: z.string().nullable(),
});

export type SignupResult = { ok: true } | { ok: false; error: string };

export async function createPendingTenant(input: z.infer<typeof SignupSchema>): Promise<SignupResult> {
  const parsed = SignupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { slug, name, email, description, turnstileToken } = parsed.data;

  if (RESERVED_SLUGS.has(slug)) return { ok: false, error: "That subdomain is reserved" };

  const { allowed } = checkRateLimit(`signup:${email.toLowerCase()}`, SIGNUP_LIMIT.maxRequests, SIGNUP_LIMIT.windowMs);
  if (!allowed) return { ok: false, error: "Too many requests — try again later" };

  if (!(await verifyTurnstile(turnstileToken))) return { ok: false, error: "Captcha failed" };

  const [liveClash, pendingClash] = await Promise.all([
    prismaGlobal.tenant.findUnique({ where: { slug } }),
    prismaGlobal.pendingTenant.findFirst({ where: { slug, status: "PENDING" } }),
  ]);
  if (liveClash || pendingClash) return { ok: false, error: "That subdomain is taken" };

  await prismaGlobal.pendingTenant.create({
    data: { slug, name, requestedEmail: email.toLowerCase(), description },
  });

  await sendEmail({
    to: process.env.PLATFORM_ADMIN_EMAILS?.split(",")[0]?.trim() ?? "dsmereski@gmail.com",
    subject: `or9.space: new org request — ${name} (${slug})`,
    text: `${name} requested ${slug}.or9.space\nContact: ${email}\n\n${description}\n\nReview: https://admin.or9.space/tenants/pending`,
  });

  return { ok: true };
}
```

- [ ] **Step 4: Run — green. Step 5: Signup UI.**

Create `app/start-org/signup-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { createPendingTenant } from "@/lib/actions/signup";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createPendingTenant({
        slug: String(formData.get("slug") ?? "").toLowerCase(),
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        description: String(formData.get("description") ?? ""),
        turnstileToken: String(formData.get("cf-turnstile-response") ?? "") || null,
      });
      if (!result.ok) { setError(result.error); return; }
      setDone(true);
    });
  }

  if (done) {
    return (
      <p className="rounded border border-green-800 bg-green-950 p-4 text-green-300">
        Request received. We review every org by hand — you will hear from us by email within 24 hours.
      </p>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <p className="rounded border border-red-800 bg-red-950 p-2 text-sm text-red-300">{error}</p>}
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Org name</label>
        <input name="name" required maxLength={120} className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Subdomain</label>
        <div className="flex items-center gap-2">
          <input name="slug" required pattern="[a-z][a-z0-9-]{2,40}" className="w-48 rounded border border-neutral-700 bg-neutral-900 p-2" />
          <span className="text-neutral-500">.or9.space</span>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Your email</label>
        <input name="email" type="email" required className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Tell us about your org (250 chars)</label>
        <textarea name="description" required maxLength={500} rows={3} className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      </div>
      <button type="submit" disabled={pending} aria-busy={pending}
        className="rounded bg-neutral-100 px-4 py-2 font-semibold text-neutral-900 disabled:opacity-50">
        {pending ? "Submitting…" : "Request your org"}
      </button>
    </form>
  );
}
```

Create `app/start-org/page.tsx`:

```tsx
import { SignupForm } from "./signup-form";

export const metadata = { title: "Start your org — or9.space" };

export default function StartOrgPage() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-2 text-3xl font-bold">Start your org</h1>
      <p className="mb-8 text-neutral-400">
        Free tier, reviewed by hand, live within a day. Your crew gets
        <code className="mx-1">yourname.or9.space</code> with forums, handbook,
        loot tracking, inventory, and more.
      </p>
      <SignupForm />
    </main>
  );
}
```

Also add a link on the marketing homepage — in `app/page.tsx`, inside the no-tenant branch, after the tagline `<p>`:

```tsx
        <a href="/start-org" className="inline-block rounded bg-neutral-100 px-4 py-2 font-semibold text-neutral-900">
          Start your org
        </a>
```

- [ ] **Step 6: Gates + commit**

```powershell
pnpm build; pnpm test; pnpm lint
git add -A
git commit -m "feat(signup): /start-org public flow with pending queue + admin email"
```

---

## Task 13: Provisioning + approval queue (TDD)

**Files:**
- Create: `lib/provisioning.ts`, `lib/actions/admin-tenants.ts`, `tests/integration/provisioning.test.ts`, `app/_admin/tenants/pending/page.tsx`, `app/_admin/tenants/pending/decide-buttons.tsx`

- [ ] **Step 1: Failing integration test** `tests/integration/provisioning.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { provisionApprovedTenant, hashClaimToken } from "@/lib/provisioning";
import { testPrisma, resetDb, closeDb } from "./setup";

describe("provisionApprovedTenant", () => {
  beforeEach(async () => { await resetDb(); });
  afterAll(async () => { await resetDb(); await closeDb(); });

  async function makePending() {
    return testPrisma.pendingTenant.create({
      data: {
        slug: "it-prov", name: "Prov Org",
        requestedEmail: "founder@it-test.example", description: "test",
      },
    });
  }

  it("provisions: tenant LIVE, config row, claim token, pending APPROVED", async () => {
    const pending = await makePending();
    const result = await provisionApprovedTenant(pending.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tenant = await testPrisma.tenant.findUnique({ where: { slug: "it-prov" } });
    expect(tenant?.status).toBe("LIVE");
    expect(tenant?.founderClaimTokenHash).toBe(hashClaimToken(result.claimToken));
    expect(result.claimUrl).toContain("it-prov");
    expect(result.claimUrl).toContain(result.claimToken);

    const cfg = await testPrisma.tenantConfigOverride.findUnique({ where: { tenantId: tenant!.id } });
    expect(cfg).not.toBeNull();

    const decided = await testPrisma.pendingTenant.findUnique({ where: { id: pending.id } });
    expect(decided?.status).toBe("APPROVED");
  });

  it("is idempotent — second call returns existing tenant without duplicating", async () => {
    const pending = await makePending();
    const first = await provisionApprovedTenant(pending.id);
    const second = await provisionApprovedTenant(pending.id);
    expect(first.ok && second.ok).toBe(true);
    const tenants = await testPrisma.tenant.findMany({ where: { slug: "it-prov" } });
    expect(tenants.length).toBe(1);
  });

  it("fails cleanly when slug got taken since approval", async () => {
    const pending = await makePending();
    await testPrisma.tenant.create({ data: { slug: "it-prov", name: "Squatter" } });
    const result = await provisionApprovedTenant(pending.id);
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run — fails. Step 3: Implement `lib/provisioning.ts`**

```ts
import { createHash, randomBytes } from "node:crypto";
import { prismaGlobal } from "./db";
import { sendEmail } from "./email";

const CLAIM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashClaimToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export type ProvisionResult =
  | { ok: true; tenantId: string; claimToken: string; claimUrl: string }
  | { ok: false; error: string };

function baseDomain(): string {
  return process.env.PLATFORM_BASE_DOMAIN ?? "or9.space";
}

/**
 * Idempotent: approving an already-provisioned pending row re-issues a fresh
 * claim token on the existing tenant (covers "founder lost the email").
 */
export async function provisionApprovedTenant(pendingId: string): Promise<ProvisionResult> {
  const pending = await prismaGlobal.pendingTenant.findUnique({ where: { id: pendingId } });
  if (!pending) return { ok: false, error: "Pending request not found" };
  if (pending.status === "REJECTED") return { ok: false, error: "Request was rejected" };

  const claimToken = randomBytes(32).toString("hex");
  const tokenHash = hashClaimToken(claimToken);
  const expires = new Date(Date.now() + CLAIM_TTL_MS);

  try {
    const tenantId = await prismaGlobal.$transaction(async (tx) => {
      const existing = await tx.tenant.findUnique({ where: { slug: pending.slug } });
      if (existing) {
        const claimed = existing.founderClaimTokenHash === null && existing.founderClaimExpiresAt === null
          && (await tx.membership.count({ where: { tenantId: existing.id, tier: "COMMAND" } })) > 0;
        if (claimed) throw new ProvisionError("Tenant already claimed");
        const samePending = pending.status === "APPROVED";
        if (!samePending) throw new ProvisionError("Subdomain already taken by a live tenant");
        await tx.tenant.update({
          where: { id: existing.id },
          data: { founderClaimTokenHash: tokenHash, founderClaimExpiresAt: expires },
        });
        return existing.id;
      }
      const tenant = await tx.tenant.create({
        data: {
          slug: pending.slug, name: pending.name, plan: "FREE", status: "LIVE",
          founderClaimTokenHash: tokenHash, founderClaimExpiresAt: expires,
        },
      });
      await tx.tenantConfigOverride.create({ data: { tenantId: tenant.id, json: {} } });
      await tx.pendingTenant.update({
        where: { id: pending.id },
        data: { status: "APPROVED", decidedAt: new Date() },
      });
      return tenant.id;
    });

    const claimUrl = `https://${pending.slug}.${baseDomain()}/claim?token=${claimToken}`;
    await sendEmail({
      to: pending.requestedEmail,
      subject: `Your org ${pending.name} is live on or9.space`,
      text: `Welcome aboard.\n\nClaim your founder seat (expires in 7 days):\n${claimUrl}\n\nThis link creates the org's first admin account.`,
    });
    return { ok: true, tenantId, claimToken, claimUrl };
  } catch (e) {
    if (e instanceof ProvisionError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function rejectPendingTenant(pendingId: string, reason: string): Promise<{ ok: boolean }> {
  const pending = await prismaGlobal.pendingTenant.findUnique({ where: { id: pendingId } });
  if (!pending || pending.status !== "PENDING") return { ok: false };
  await prismaGlobal.pendingTenant.update({
    where: { id: pendingId },
    data: { status: "REJECTED", decidedAt: new Date() },
  });
  await sendEmail({
    to: pending.requestedEmail,
    subject: `or9.space: about your request for ${pending.slug}.or9.space`,
    text: `We could not approve your org request.\n\nReason: ${reason}\n\nYou are welcome to re-apply: https://or9.space/start-org`,
  });
  return { ok: true };
}

class ProvisionError extends Error {}
```

- [ ] **Step 4: Run — green. Step 5: Admin actions + queue UI.**

Create `lib/actions/admin-tenants.ts`:

```ts
"use server";

import { requirePlatformAdmin } from "../platform-admin";
import { provisionApprovedTenant, rejectPendingTenant, type ProvisionResult } from "../provisioning";

export async function approveTenantAction(pendingId: string): Promise<ProvisionResult> {
  await requirePlatformAdmin();
  return await provisionApprovedTenant(pendingId);
}

export async function rejectTenantAction(pendingId: string, reason: string): Promise<{ ok: boolean }> {
  await requirePlatformAdmin();
  return await rejectPendingTenant(pendingId, reason || "Not a fit for or9.space right now");
}
```

Create `app/_admin/tenants/pending/decide-buttons.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { approveTenantAction, rejectTenantAction } from "@/lib/actions/admin-tenants";

export function DecideButtons({ pendingId }: { pendingId: string }) {
  const [pending, startTransition] = useTransition();
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (claimUrl) {
    return (
      <div className="text-xs">
        <p className="text-green-400">Approved. Claim URL (also emailed):</p>
        <code className="block break-all rounded bg-neutral-900 p-1">{claimUrl}</code>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button
        disabled={pending}
        onClick={() => startTransition(async () => {
          const r = await approveTenantAction(pendingId);
          if (r.ok) setClaimUrl(r.claimUrl); else setError(r.error);
        })}
        className="rounded bg-green-700 px-3 py-1 text-sm disabled:opacity-50">
        Approve
      </button>
      <button
        disabled={pending}
        onClick={() => {
          const reason = window.prompt("Rejection reason (sent to requester):") ?? "";
          if (!reason) return;
          startTransition(async () => { await rejectTenantAction(pendingId, reason); window.location.reload(); });
        }}
        className="rounded bg-red-800 px-3 py-1 text-sm disabled:opacity-50">
        Reject
      </button>
    </div>
  );
}
```

Create `app/_admin/tenants/pending/page.tsx`:

```tsx
import { prismaGlobal } from "@/lib/db";
import { DecideButtons } from "./decide-buttons";

export default async function PendingTenantsPage() {
  const rows = await prismaGlobal.pendingTenant.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  const liveSlugs = await prismaGlobal.tenant.findMany({ select: { slug: true, name: true } });

  function similarTo(slug: string): string | null {
    const hit = liveSlugs.find(
      (t) => t.slug !== slug && (t.slug.includes(slug) || slug.includes(t.slug)),
    );
    return hit ? `similar to existing "${hit.slug}"` : null;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pending org requests</h1>
      {rows.length === 0 && <p className="text-neutral-400">Queue is empty.</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded border border-neutral-800 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{r.name} <code className="text-neutral-400">{r.slug}.or9.space</code></p>
                <p className="text-sm text-neutral-400">{r.requestedEmail} · {r.createdAt.toISOString().slice(0, 10)}</p>
                {similarTo(r.slug) && <p className="text-sm text-amber-400">⚠ {similarTo(r.slug)}</p>}
                <p className="mt-2 text-sm text-neutral-300">{r.description}</p>
              </div>
              <DecideButtons pendingId={r.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: Gates + commit**

```powershell
pnpm build; pnpm test; pnpm lint
git add -A
git commit -m "feat(provisioning): idempotent tenant provisioning + admin approval queue"
```

---

## Task 14: Founder claim flow (TDD)

**Files:**
- Create: `lib/actions/claim.ts`, `tests/integration/claim.test.ts`, `app/claim/page.tsx`, `app/claim/claim-form.tsx`

- [ ] **Step 1: Failing integration test** `tests/integration/claim.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { claimFounderSeat } from "@/lib/actions/claim";
import { provisionApprovedTenant } from "@/lib/provisioning";
import { testPrisma, resetDb, closeDb } from "./setup";

describe("claimFounderSeat", () => {
  let claimToken: string;
  let tenantId: string;

  beforeEach(async () => {
    await resetDb();
    const pending = await testPrisma.pendingTenant.create({
      data: { slug: "it-claim", name: "Claim Org", requestedEmail: "f@it-test.example", description: "d" },
    });
    const r = await provisionApprovedTenant(pending.id);
    if (!r.ok) throw new Error("provision failed");
    claimToken = r.claimToken;
    tenantId = r.tenantId;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("claims: COMMAND membership created, token burned", async () => {
    const r = await claimFounderSeat({
      tenantSlug: "it-claim", token: claimToken,
      email: "f@it-test.example", password: "longenoughpw", username: "founder",
    });
    expect(r.ok).toBe(true);
    const m = await testPrisma.membership.findFirst({ where: { tenantId } });
    expect(m?.tier).toBe("COMMAND");
    const t = await testPrisma.tenant.findUnique({ where: { id: tenantId } });
    expect(t?.founderClaimTokenHash).toBeNull();
  });

  it("rejects a wrong token", async () => {
    const r = await claimFounderSeat({
      tenantSlug: "it-claim", token: "deadbeef".repeat(8),
      email: "f@it-test.example", password: "longenoughpw", username: "founder",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects reuse after a successful claim", async () => {
    await claimFounderSeat({
      tenantSlug: "it-claim", token: claimToken,
      email: "f@it-test.example", password: "longenoughpw", username: "founder",
    });
    const again = await claimFounderSeat({
      tenantSlug: "it-claim", token: claimToken,
      email: "f2@it-test.example", password: "longenoughpw", username: "founder2",
    });
    expect(again.ok).toBe(false);
  });

  it("rejects an expired token", async () => {
    await testPrisma.tenant.update({
      where: { id: tenantId },
      data: { founderClaimExpiresAt: new Date(Date.now() - 1000) },
    });
    const r = await claimFounderSeat({
      tenantSlug: "it-claim", token: claimToken,
      email: "f@it-test.example", password: "longenoughpw", username: "founder",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/expired/i);
  });
});
```

- [ ] **Step 2: Run — fails. Step 3: Implement `lib/actions/claim.ts`**

```ts
"use server";

import { z } from "zod";
import { prismaGlobal } from "../db";
import { hashClaimToken } from "../provisioning";
import { hashPassword } from "../password";

const ClaimSchema = z.object({
  tenantSlug: z.string().min(1),
  token: z.string().length(64),
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
  username: z.string().regex(/^[a-zA-Z0-9_.-]{2,32}$/),
});

export type ClaimResult = { ok: true } | { ok: false; error: string };

export async function claimFounderSeat(input: z.infer<typeof ClaimSchema>): Promise<ClaimResult> {
  const parsed = ClaimSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { tenantSlug, token, email, password, username } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    await prismaGlobal.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant?.founderClaimTokenHash) throw new ClaimError("This org has already been claimed");
      if (tenant.founderClaimTokenHash !== hashClaimToken(token)) throw new ClaimError("Invalid claim link");
      if (tenant.founderClaimExpiresAt && tenant.founderClaimExpiresAt < new Date()) {
        throw new ClaimError("Claim link expired — contact support for a fresh one");
      }

      const existing = await tx.account.findUnique({
        where: { email: normalizedEmail },
        include: { memberships: { select: { id: true } } },
      });
      if (existing && existing.memberships.length > 0) {
        throw new ClaimError("This email is already a member of an org — contact support");
      }
      const account =
        existing ??
        (await tx.account.create({
          data: { email: normalizedEmail, passwordHash: await hashPassword(password) },
        }));
      await tx.membership.create({
        data: { accountId: account.id, tenantId: tenant.id, username, tier: "COMMAND" },
      });
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { founderClaimTokenHash: null, founderClaimExpiresAt: null },
      });
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ClaimError) return { ok: false, error: e.message };
    throw e;
  }
}

class ClaimError extends Error {}
```

- [ ] **Step 4: Run — green. Step 5: Claim UI.**

Create `app/claim/claim-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { claimFounderSeat } from "@/lib/actions/claim";

export function ClaimForm({ tenantSlug, token }: { tenantSlug: string; token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await claimFounderSeat({
        tenantSlug, token,
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        username: String(formData.get("username") ?? ""),
      });
      if (!r.ok) { setError(r.error); return; }
      window.location.href = "/login?claimed=1";
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <p className="rounded border border-red-800 bg-red-950 p-2 text-sm text-red-300">{error}</p>}
      <input name="username" required placeholder="Your username" className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <input name="email" type="email" required placeholder="Email" className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <input name="password" type="password" required placeholder="Password (10+ chars)" className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <button type="submit" disabled={pending} aria-busy={pending}
        className="w-full rounded bg-neutral-100 p-2 font-semibold text-neutral-900 disabled:opacity-50">
        {pending ? "Claiming…" : "Claim founder seat"}
      </button>
    </form>
  );
}
```

Create `app/claim/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/server/get-tenant";
import { ClaimForm } from "./claim-form";

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const tenant = await getCurrentTenant();
  const { token } = await searchParams;
  if (!tenant || !token) notFound();

  return (
    <main className="mx-auto mt-16 w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Claim {tenant.name}</h1>
      <p className="text-sm text-neutral-400">
        You are creating the founding admin account for <code>{tenant.slug}.or9.space</code>.
      </p>
      <ClaimForm tenantSlug={tenant.slug} token={token} />
    </main>
  );
}
```

- [ ] **Step 6: Gates + commit**

```powershell
pnpm build; pnpm test; pnpm lint
git add -A
git commit -m "feat(claim): founder claim flow with single-use expiring token"
```

---

## Task 15: Support portal (TDD)

**Files:**
- Create: `lib/actions/support.ts`, `tests/integration/support.test.ts`, `app/_support/layout.tsx`, `app/_support/page.tsx`, `app/_support/ticket-form.tsx`, `app/_support/tickets/[ticketId]/page.tsx`, `app/_support/tickets/[ticketId]/reply-form.tsx`, `app/_support/login-direct/page.tsx`, `app/_admin/support/page.tsx`, `app/_admin/support/[ticketId]/page.tsx`, `app/_admin/support/[ticketId]/admin-reply-form.tsx`

- [ ] **Step 1: Failing integration test** `tests/integration/support.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createTicketCore, replyTicketCore, closeTicketCore } from "@/lib/actions/support";
import { testPrisma, resetDb, closeDb } from "./setup";
import { _resetRateLimitStore } from "@/lib/rate-limit";

describe("support tickets", () => {
  let accountId: string;
  let otherAccountId: string;

  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    accountId = (await testPrisma.account.create({ data: { email: "u@it-test.example" } })).id;
    otherAccountId = (await testPrisma.account.create({ data: { email: "o@it-test.example" } })).id;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("creates a ticket with first message", async () => {
    const r = await createTicketCore(accountId, { subject: "Help", body: "It broke", tenantContextId: null });
    expect(r.ok).toBe(true);
    const ticket = await testPrisma.supportTicket.findFirst({ where: { accountId }, include: { messages: true } });
    expect(ticket?.messages.length).toBe(1);
    expect(ticket?.status).toBe("OPEN");
  });

  it("rate limits at 5 tickets/day per account", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await createTicketCore(accountId, { subject: `t${i}`, body: "b", tenantContextId: null });
      expect(r.ok).toBe(true);
    }
    const sixth = await createTicketCore(accountId, { subject: "t6", body: "b", tenantContextId: null });
    expect(sixth.ok).toBe(false);
  });

  it("owner can reply; stranger cannot", async () => {
    const r = await createTicketCore(accountId, { subject: "Help", body: "x", tenantContextId: null });
    if (!r.ok) throw new Error("create failed");
    const ownerReply = await replyTicketCore(accountId, { ticketId: r.ticketId, body: "more info", isAdmin: false });
    expect(ownerReply.ok).toBe(true);
    const strangerReply = await replyTicketCore(otherAccountId, { ticketId: r.ticketId, body: "hi", isAdmin: false });
    expect(strangerReply.ok).toBe(false);
  });

  it("admin reply flips status to ANSWERED; close flips to CLOSED", async () => {
    const r = await createTicketCore(accountId, { subject: "Help", body: "x", tenantContextId: null });
    if (!r.ok) throw new Error("create failed");
    await replyTicketCore(otherAccountId, { ticketId: r.ticketId, body: "fixed it", isAdmin: true });
    let t = await testPrisma.supportTicket.findUnique({ where: { id: r.ticketId } });
    expect(t?.status).toBe("ANSWERED");
    await closeTicketCore(accountId, r.ticketId, false);
    t = await testPrisma.supportTicket.findUnique({ where: { id: r.ticketId } });
    expect(t?.status).toBe("CLOSED");
  });
});
```

- [ ] **Step 2: Run — fails. Step 3: Implement `lib/actions/support.ts`**

```ts
"use server";

import { z } from "zod";
import { prismaGlobal } from "../db";
import { getSessionAccountId } from "../auth";
import { requirePlatformAdmin } from "../platform-admin";
import { checkRateLimit, SUPPORT_TICKET_LIMIT } from "../rate-limit";
import { sendEmail } from "../email";

const TicketSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(3).max(5000),
  tenantContextId: z.string().nullable(),
});

const ReplySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(1).max(5000),
  isAdmin: z.boolean(),
});

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Core functions take an explicit accountId so integration tests can call
 *  them without a session. The exported server actions resolve the session. */

export async function createTicketCore(
  accountId: string,
  input: z.infer<typeof TicketSchema>,
): Promise<Result<{ ticketId: string }>> {
  const parsed = TicketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { allowed } = checkRateLimit(
    `support:${accountId}`,
    SUPPORT_TICKET_LIMIT.maxRequests,
    SUPPORT_TICKET_LIMIT.windowMs,
  );
  if (!allowed) return { ok: false, error: "Ticket limit reached for today" };

  const ticket = await prismaGlobal.supportTicket.create({
    data: {
      accountId,
      subject: parsed.data.subject,
      tenantContextId: parsed.data.tenantContextId,
      messages: { create: { accountId, body: parsed.data.body, isAdminReply: false } },
    },
  });

  await sendEmail({
    to: process.env.PLATFORM_ADMIN_EMAILS?.split(",")[0]?.trim() ?? "dsmereski@gmail.com",
    subject: `or9 support: ${parsed.data.subject}`,
    text: `New ticket from account ${accountId}\n\n${parsed.data.body}\n\nhttps://admin.or9.space/support/${ticket.id}`,
  });

  return { ok: true, ticketId: ticket.id };
}

export async function replyTicketCore(
  actorAccountId: string,
  input: z.infer<typeof ReplySchema>,
): Promise<Result> {
  const parsed = ReplySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { ticketId, body, isAdmin } = parsed.data;

  const ticket = await prismaGlobal.supportTicket.findUnique({
    where: { id: ticketId },
    include: { account: { select: { email: true } } },
  });
  if (!ticket) return { ok: false, error: "Ticket not found" };
  if (ticket.status === "CLOSED") return { ok: false, error: "Ticket is closed" };
  if (!isAdmin && ticket.accountId !== actorAccountId) return { ok: false, error: "Not your ticket" };

  await prismaGlobal.supportMessage.create({
    data: { ticketId, accountId: actorAccountId, body, isAdminReply: isAdmin },
  });
  await prismaGlobal.supportTicket.update({
    where: { id: ticketId },
    data: { status: isAdmin ? "ANSWERED" : "OPEN" },
  });

  if (isAdmin) {
    await sendEmail({
      to: ticket.account.email,
      subject: `or9.space support replied: ${ticket.subject}`,
      text: `${body}\n\nView the thread: https://support.or9.space/tickets/${ticketId}`,
    });
  }
  return { ok: true };
}

export async function closeTicketCore(
  actorAccountId: string,
  ticketId: string,
  isAdmin: boolean,
): Promise<Result> {
  const ticket = await prismaGlobal.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false, error: "Ticket not found" };
  if (!isAdmin && ticket.accountId !== actorAccountId) return { ok: false, error: "Not your ticket" };
  await prismaGlobal.supportTicket.update({
    where: { id: ticketId },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  return { ok: true };
}

/** ===== session-bound server actions (UI entry points) ===== */

export async function createTicketAction(input: z.infer<typeof TicketSchema>) {
  const accountId = await getSessionAccountId();
  if (!accountId) return { ok: false as const, error: "Sign in required" };
  return createTicketCore(accountId, input);
}

export async function replyTicketAction(ticketId: string, body: string) {
  const accountId = await getSessionAccountId();
  if (!accountId) return { ok: false as const, error: "Sign in required" };
  return replyTicketCore(accountId, { ticketId, body, isAdmin: false });
}

export async function closeTicketAction(ticketId: string) {
  const accountId = await getSessionAccountId();
  if (!accountId) return { ok: false as const, error: "Sign in required" };
  return closeTicketCore(accountId, ticketId, false);
}

export async function adminReplyTicketAction(ticketId: string, body: string) {
  const { accountId } = await requirePlatformAdmin();
  return replyTicketCore(accountId, { ticketId, body, isAdmin: true });
}

export async function adminCloseTicketAction(ticketId: string) {
  const { accountId } = await requirePlatformAdmin();
  return closeTicketCore(accountId, ticketId, true);
}
```

- [ ] **Step 4: Run — green. Step 5: Support portal UI (member side).**

Create `app/_support/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { getSessionAccountId } from "@/lib/auth";

export default async function SupportLayout({ children }: { children: ReactNode }) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-2xl font-bold">or9.space support</h1>
          <p className="text-neutral-400">
            Sign in to open a ticket: <a className="underline" href="/login-direct">sign in here</a>.
          </p>
        </div>
      </main>
    );
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800 p-4">
        <a href="/" className="font-bold">or9.space support</a>
      </header>
      <main className="mx-auto max-w-2xl p-6">{children}</main>
    </div>
  );
}
```

Create `app/_support/login-direct/page.tsx`:

```tsx
import { AuthForm } from "@/app/(auth)/auth-form";

export default function SupportLoginPage() {
  return <AuthForm mode="login" tenantName="or9.space support" />;
}
```

Create `app/_support/ticket-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { createTicketAction } from "@/lib/actions/support";

export function TicketForm({ tenantContextId }: { tenantContextId: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await createTicketAction({
        subject: String(formData.get("subject") ?? ""),
        body: String(formData.get("body") ?? ""),
        tenantContextId,
      });
      if (!r.ok) { setError(r.error); return; }
      window.location.href = `/tickets/${(r as any).ticketId}`;
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      {error && <p className="rounded border border-red-800 bg-red-950 p-2 text-sm text-red-300">{error}</p>}
      <input name="subject" required maxLength={200} placeholder="Subject"
        className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <textarea name="body" required maxLength={5000} rows={5} placeholder="Describe the problem…"
        className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <button type="submit" disabled={pending} aria-busy={pending}
        className="rounded bg-neutral-100 px-4 py-2 font-semibold text-neutral-900 disabled:opacity-50">
        {pending ? "Submitting…" : "Open ticket"}
      </button>
    </form>
  );
}
```

Create `app/_support/page.tsx`:

```tsx
import { getSessionAccountId } from "@/lib/auth";
import { prismaGlobal } from "@/lib/db";
import { TicketForm } from "./ticket-form";

export default async function SupportHome({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const accountId = (await getSessionAccountId())!;
  const { tenant } = await searchParams;
  const tenantRow = tenant
    ? await prismaGlobal.tenant.findUnique({ where: { slug: tenant } })
    : null;
  const myTickets = await prismaGlobal.supportTicket.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-3 text-2xl font-bold">Open a ticket</h1>
        <TicketForm tenantContextId={tenantRow?.id ?? null} />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Your tickets</h2>
        {myTickets.length === 0 && <p className="text-neutral-400">None yet.</p>}
        <ul className="divide-y divide-neutral-800">
          {myTickets.map((t) => (
            <li key={t.id} className="py-2">
              <a href={`/tickets/${t.id}`} className="hover:underline">{t.subject}</a>
              <span className="ml-2 text-xs text-neutral-500">{t.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

Create `app/_support/tickets/[ticketId]/reply-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { replyTicketAction, closeTicketAction } from "@/lib/actions/support";

export function ReplyForm({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (closed) return <p className="text-sm text-neutral-500">This ticket is closed.</p>;

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await replyTicketAction(ticketId, String(formData.get("body") ?? ""));
      if (!r.ok) { setError(r.error); return; }
      window.location.reload();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-2">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <textarea name="body" required maxLength={5000} rows={3}
        className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900 disabled:opacity-50">
          Reply
        </button>
        <button type="button" disabled={pending}
          onClick={() => startTransition(async () => { await closeTicketAction(ticketId); window.location.reload(); })}
          className="rounded border border-neutral-700 px-3 py-1.5 text-sm disabled:opacity-50">
          Close ticket
        </button>
      </div>
    </form>
  );
}
```

Create `app/_support/tickets/[ticketId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getSessionAccountId } from "@/lib/auth";
import { prismaGlobal } from "@/lib/db";
import { ReplyForm } from "./reply-form";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const accountId = (await getSessionAccountId())!;
  const { ticketId } = await params;
  const ticket = await prismaGlobal.supportTicket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket || ticket.accountId !== accountId) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ticket.subject}
        <span className="ml-2 text-sm font-normal text-neutral-500">{ticket.status}</span>
      </h1>
      <ul className="space-y-3">
        {ticket.messages.map((m) => (
          <li key={m.id} className={`rounded border p-3 ${m.isAdminReply ? "border-blue-900 bg-blue-950/40" : "border-neutral-800"}`}>
            <p className="mb-1 text-xs text-neutral-500">{m.isAdminReply ? "or9 support" : "you"} · {m.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
            <p className="whitespace-pre-wrap text-sm">{m.body}</p>
          </li>
        ))}
      </ul>
      <ReplyForm ticketId={ticket.id} closed={ticket.status === "CLOSED"} />
    </div>
  );
}
```

- [ ] **Step 6: Admin triage UI.**

Create `app/_admin/support/page.tsx`:

```tsx
import { prismaGlobal } from "@/lib/db";

export default async function AdminSupportPage() {
  const tickets = await prismaGlobal.supportTicket.findMany({
    where: { status: { not: "CLOSED" } },
    orderBy: { createdAt: "asc" },
    include: { account: { select: { email: true } } },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Support queue</h1>
      {tickets.length === 0 && <p className="text-neutral-400">Queue is empty.</p>}
      <ul className="divide-y divide-neutral-800">
        {tickets.map((t) => (
          <li key={t.id} className="py-2">
            <a href={`/support/${t.id}`} className="hover:underline">{t.subject}</a>
            <span className="ml-2 text-xs text-neutral-500">{t.status} · {t.account.email}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Create `app/_admin/support/[ticketId]/admin-reply-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { adminReplyTicketAction, adminCloseTicketAction } from "@/lib/actions/support";

export function AdminReplyForm({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (closed) return <p className="text-sm text-neutral-500">Closed.</p>;

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await adminReplyTicketAction(ticketId, String(formData.get("body") ?? ""));
      if (!r.ok) { setError(r.error); return; }
      window.location.reload();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-2">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <textarea name="body" required maxLength={5000} rows={3}
        className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="rounded bg-blue-700 px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
          Reply as or9 support
        </button>
        <button type="button" disabled={pending}
          onClick={() => startTransition(async () => { await adminCloseTicketAction(ticketId); window.location.href = "/support"; })}
          className="rounded border border-neutral-700 px-3 py-1.5 text-sm disabled:opacity-50">
          Close
        </button>
      </div>
    </form>
  );
}
```

Create `app/_admin/support/[ticketId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { prismaGlobal } from "@/lib/db";
import { AdminReplyForm } from "./admin-reply-form";

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const ticket = await prismaGlobal.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      account: { select: { email: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ticket.subject}</h1>
      <p className="text-sm text-neutral-400">{ticket.account.email} · {ticket.status}
        {ticket.tenantContextId && <> · tenant ctx: <code>{ticket.tenantContextId}</code></>}
      </p>
      <ul className="space-y-3">
        {ticket.messages.map((m) => (
          <li key={m.id} className={`rounded border p-3 ${m.isAdminReply ? "border-blue-900 bg-blue-950/40" : "border-neutral-800"}`}>
            <p className="mb-1 text-xs text-neutral-500">{m.isAdminReply ? "or9 support" : "requester"} · {m.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
            <p className="whitespace-pre-wrap text-sm">{m.body}</p>
          </li>
        ))}
      </ul>
      <AdminReplyForm ticketId={ticket.id} closed={ticket.status === "CLOSED"} />
    </div>
  );
}
```

- [ ] **Step 7: Gates + commit**

```powershell
pnpm build; pnpm test; pnpm lint
git add -A
git commit -m "feat(support): ticket portal, member threads, admin triage, email notify"
```

---

## Task 16: Wire DB config overrides into the tenant page

**Files:**
- Modify: `lib/server/get-tenant.ts`, `app/page.tsx`
- Create: `tests/integration/config-override.test.ts`

- [ ] **Step 1: Failing test** `tests/integration/config-override.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { resolveTenantConfig } from "@/lib/config";
import { getTenantDbOverrides } from "@/lib/server/get-tenant";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A } from "./setup";

describe("config override resolution", () => {
  beforeEach(async () => { await resetDb(); await seedTwoTenants(); });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("DB override beats plan + platform defaults", async () => {
    await testPrisma.tenantConfigOverride.upsert({
      where: { tenantId: TENANT_A.id },
      update: { json: { branding: { name: "Alpha Override" } } },
      create: { tenantId: TENANT_A.id, json: { branding: { name: "Alpha Override" } } },
    });
    const overrides = await getTenantDbOverrides(TENANT_A.id);
    const cfg = await resolveTenantConfig("FREE", overrides);
    expect(cfg.branding.name).toBe("Alpha Override");
    expect(cfg.features.forums).toBe(true); // defaults still flow through
  });

  it("missing override row = pure defaults", async () => {
    const overrides = await getTenantDbOverrides(TENANT_A.id);
    const cfg = await resolveTenantConfig("FREE", overrides);
    expect(cfg.branding.name).toBe("or9.space tenant");
  });
});
```

- [ ] **Step 2: Run — fails. Step 3: Extend `lib/server/get-tenant.ts`**

Append:

```ts
export async function getTenantDbOverrides(tenantId: string): Promise<Record<string, unknown>> {
  const row = await prismaGlobal.tenantConfigOverride.findUnique({ where: { tenantId } });
  return (row?.json as Record<string, unknown>) ?? {};
}
```

- [ ] **Step 4: Modify `app/page.tsx`** — replace the config resolution line:

```tsx
  const cfg = await resolveTenantConfig(tenant.plan, await getTenantDbOverrides(tenant.id));
```

(and add `getTenantDbOverrides` to the existing import from `@/lib/server/get-tenant`).

- [ ] **Step 5: Gates + commit**

```powershell
pnpm build; pnpm test; pnpm lint
git add -A
git commit -m "feat(config): tenant DB overrides flow into page rendering"
```

---

## Task 17: Tenant-leak fuzzer + nightly CI

**Files:**
- Create: `scripts/tenant-leak-fuzzer.ts`, `.github/workflows/nightly-fuzz.yml`
- Modify: `package.json`

- [ ] **Step 1: Write `scripts/tenant-leak-fuzzer.ts`**

```ts
import { PrismaClient } from "@prisma/client";
import { db } from "../lib/db";
import { makeTenantContext } from "../lib/tenant";

/**
 * Tenant-leak fuzzer. Seeds two tenants with marker data, then reads every
 * tenant-scoped model through db(ctx) for tenant A and asserts no tenant-B
 * marker appears anywhere in the serialized result. Exits 1 on any leak.
 *
 * Run: pnpm fuzz:leak  (uses DATABASE_URL)
 */
const prisma = new PrismaClient();

const A = { id: "fz-alpha", slug: "fz-alpha", name: "Fuzz Alpha" };
const B = { id: "fz-bravo", slug: "fz-bravo", name: "Fuzz Bravo" };
const MARKER_B = "FZMARKER_BRAVO_SECRET";

// Phase 1: membership + auditLog are the tenant-scoped tables.
// Phase 3 ports MUST add each new model here.
const TENANT_SCOPED_READS: Array<{ model: string; read: (ctx: any) => Promise<unknown> }> = [
  { model: "membership", read: (ctx) => db(ctx).membership.findMany({}) },
  { model: "auditLog", read: (ctx) => db(ctx).auditLog.findMany({}) },
];

async function seed() {
  for (const t of [A, B]) {
    await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: {},
      create: { id: t.id, slug: t.slug, name: t.name, status: "LIVE", plan: "FREE" },
    });
  }
  const acc = await prisma.account.upsert({
    where: { email: "fuzz@fz-test.example" },
    update: {},
    create: { email: "fuzz@fz-test.example" },
  });
  await prisma.membership.upsert({
    where: { tenantId_username: { tenantId: B.id, username: MARKER_B } },
    update: {},
    create: { accountId: acc.id, tenantId: B.id, username: MARKER_B },
  });
  await prisma.auditLog.create({
    data: { tenantId: B.id, actorAccountId: acc.id, action: MARKER_B, detail: {} },
  });
}

async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { tenantId: { in: [A.id, B.id] } } });
  await prisma.membership.deleteMany({ where: { tenantId: { in: [A.id, B.id] } } });
  await prisma.account.deleteMany({ where: { email: { contains: "@fz-test." } } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: "fz-" } } });
}

async function main() {
  await cleanup();
  await seed();
  const ctxA = makeTenantContext(A.id);
  let leaks = 0;
  for (const probe of TENANT_SCOPED_READS) {
    const result = await probe.read(ctxA);
    const json = JSON.stringify(result);
    if (json.includes(MARKER_B) || json.includes(B.id)) {
      console.error(`LEAK: reading ${probe.model} as tenant A exposed tenant B data`);
      leaks++;
    } else {
      console.log(`ok: ${probe.model} isolated`);
    }
  }
  await cleanup();
  await prisma.$disconnect();
  if (leaks > 0) {
    console.error(`${leaks} leak(s) found`);
    process.exit(1);
  }
  console.log("tenant-leak fuzzer: no leaks");
}

main();
```

Add script: `"fuzz:leak": "tsx scripts/tenant-leak-fuzzer.ts"`.

- [ ] **Step 2: Run locally**

```powershell
pnpm fuzz:leak
```

Expected output ends `tenant-leak fuzzer: no leaks`.

- [ ] **Step 3: Write `.github/workflows/nightly-fuzz.yml`**

```yaml
name: Nightly tenant-leak fuzz

on:
  schedule:
    - cron: "17 7 * * *"
  workflow_dispatch:

jobs:
  fuzz:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: platform_fuzz
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
        with:
          version: 11.5.3
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Generate + migrate
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/platform_fuzz
          DIRECT_URL: postgres://postgres:postgres@localhost:5432/platform_fuzz
        run: |
          pnpm exec prisma generate
          pnpm exec prisma migrate deploy
      - name: Fuzz
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/platform_fuzz
          DIRECT_URL: postgres://postgres:postgres@localhost:5432/platform_fuzz
        run: pnpm fuzz:leak
```

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat(security): tenant-leak fuzzer + nightly CI schedule"
```

---

## Task 18: Full-suite gate, push, PR, CI

- [ ] **Step 1: Run everything**

```powershell
pnpm test
pnpm lint
pnpm lint:rule-test
pnpm exec tsc --noEmit
pnpm build
pnpm fuzz:leak
```

All green.

- [ ] **Step 2: Push + PR**

```powershell
git push -u origin feat/phase-1-skeleton
gh pr create --repo or9space/platform --base main --head feat/phase-1-skeleton --title "Phase 1: platform skeleton — lifecycle, auth, support, isolation hardening" --body "Tenant lifecycle (signup/approve/provision/claim), NextAuth credentials, support portal, RLS + ESLint rule + leak fuzzer. Per docs/superpowers/plans/2026-06-12-phase-1-skeleton.md"
```

- [ ] **Step 3: Watch CI on the PR**

```powershell
gh pr checks --repo or9space/platform --watch
```

Green required. Fix anything red, push fixes, re-watch.

- [ ] **Step 4: STOP — controller review gate**

Do not merge. The controller (opus) reviews the full diff against this plan, then David smoke-tests, then merge happens per AGENTS.md.

---

## Task 19: Deploy Phase 1 to the VPS (controller-run, after merge)

Run AFTER the PR merges to main. Controller does this directly (SSH access).

- [ ] **Step 1: Pull + rebuild on VPS**

```sh
cd /opt/platform-src && git pull
docker build -t platform:latest .
docker build --target builder -t platform-builder:latest .
```

- [ ] **Step 2: Migrate + RLS**

```sh
cd /opt/platform
docker run --rm --network platform_default --env-file .env platform-builder:latest \
  sh -c "pnpm exec prisma migrate deploy"
docker run --rm --network platform_default --env-file .env \
  -e APP_USER_PASSWORD=<generate-strong> platform-builder:latest \
  sh -c "pnpm db:setup-rls"
```

- [ ] **Step 3: Switch app to the RLS role**

Update `/opt/platform/.env`: `DATABASE_URL` → `postgresql://app_user:<pw>@db:5432/platform`, keep `DIRECT_URL` on postgres superuser, add `RLS_ENABLED=1`, add `PLATFORM_ADMIN_EMAILS=dsmereski@gmail.com`, set strong `AUTH_SECRET`/`NEXTAUTH_SECRET`, `NEXTAUTH_URL=https://or9.space`.

- [ ] **Step 4: Restart + smoke**

```sh
docker compose up -d next-app
curl -s https://demo.or9.space/api/health
```

Then walk the full loop on prod: or9.space/start-org → submit → admin.or9.space approve (claim URL surfaces in UI) → claim on the new subdomain → login → support.or9.space ticket → admin reply. Each step verified by the controller via browser/curl.

---

## Self-Review

**Spec coverage (Phase 1 deliverables from spec §12):**
- Tenant table + middleware resolution — Phase 0 ✓ (extended by Task 2 host classifier)
- Global account + per-tenant membership — Phase 0 schema + Task 10 guard ✓
- Row-level tenancy + RLS + ESLint rule — Tasks 4, 5 ✓
- Two hard-coded tenants — Phase 0 ✓
- NextAuth (credentials; Discord deferred — logged deviation) — Task 9 ✓
- Sign-up form → pending_tenant — Task 12 ✓
- Approval queue — Task 13 ✓
- support portal + triage — Task 15 ✓
- Resend integration — Task 7 (env-gated) ✓
- Self-host docs — Phase 0 + Task 4 RLS section ✓
- Tenant-leak fuzzer in CI — Task 17 ✓
- Exit criteria walk — Task 19 ✓

**Known gaps accepted:** Discord OAuth (Phase 1.5), demo nightly reset (deferred), Turnstile/Resend live keys (env-gated; David provisions whenever), pending-tenant auto-reject cron at 30d (deferred to Phase 2 — queue is tiny at this scale).

**Placeholder scan:** no TBD/TODO; all steps carry full code. One intentional runtime-choice note (Task 5 CJS/ESM rule-file fallback) with explicit both-paths instructions.

**Type consistency check:** `RegisterResult`/`ClaimResult`/`ProvisionResult` shapes consistent; `getSessionAccountId` used by Tasks 11/15; `hashClaimToken` exported from provisioning used by claim; `TENANT_A/B` fixtures shared; GLOBAL_TABLES rename (`tenantConfigOverride`) applied in Task 1 + mirrored in the ESLint rule (Task 5) + fuzzer reads only tenant-scoped models. `tenantId_username` composite key name matches `@@unique([tenantId, username])`.

---

## Execution

Subagent-driven per task, two-stage review on security-critical tasks (4, 5, 10, 13, 14), direct controller verify on mechanical ones. Controller runs Task 19 after merge.
