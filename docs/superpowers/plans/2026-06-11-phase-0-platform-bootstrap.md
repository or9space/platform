# Phase 0 — Platform Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the `or9space/platform` open-source repo and the `or9space/platform-paid` closed-overlay repo, provision the production VPS host on Hetzner with CF Tunnel, deploy a tenant-aware hello-world Next 16 app that resolves correctly at `demo.or9.space`, set up CI, and define the multi-agent dev workflow so Phase 1 can start cleanly.

**Architecture:** Single Next 16 app deployed to a Hetzner CX22 VPS via Docker Compose, fronted by Cloudflare (free tier) with CF Tunnel to avoid exposing the VPS IP. Two-repo workspace: `platform/` (AGPL-3.0 OSS) holds everything; `platform-paid/` (private) overlays as a workspace sibling and registers closed-source providers via a 5-line `ExtensionRegistry`. The OSS repo on its own boots a fully functional self-host build. Hosted-or9.space combines both at build time.

**Tech Stack:** Next 16 (App Router), TypeScript, Tailwind v4, Prisma 6, Supabase Postgres (free tier), NextAuth 5, pnpm workspaces, Docker Compose, Cloudflare Tunnel, Cloudflare DNS, Hetzner Cloud, GitHub Actions, Vitest.

**Spec reference:** `docs/superpowers/specs/2026-06-11-or9-space-platform-design.md`

**Cost ceiling for Phase 0:** Hetzner CX22 (~$6/mo). Everything else free tier. Total monthly: $5–6.

**Estimated time:** 1–2 days of focused work.

---

## File Structure

The OSS repo `platform/` will live at `C:\Projects\platform` locally. Final layout at end of Phase 0:

```
C:\Projects\platform\                       ← OSS repo (AGPL-3.0)
  .github\workflows\ci.yml                  ← GitHub Actions: lint + typecheck + test
  .eslintrc.cjs                             ← ESLint config + custom rule loader
  eslint-rules\
    no-untenanted-query.js                  ← Custom ESLint rule scaffold
    no-untenanted-query.test.js             ← Self-test for the rule
  app\
    layout.tsx                              ← Root layout
    page.tsx                                ← Marketing site root (or9.space)
    (tenant)\page.tsx                       ← Hello-world tenant page
  middleware.ts                             ← Reads x-or9-tenant header from CF
  lib\
    db.ts                                   ← Tenant-aware Prisma proxy
    permissions.ts                          ← requireTier, requireFeature stubs
    tenant.ts                               ← Tenant resolution helpers
    config\
      schema.ts                             ← Zod schema (scaffold only)
      defaults.yaml                         ← Platform defaults
      plans\
        free.yaml                           ← Free-tier defaults
      index.ts                              ← Config resolution
    feature-flags.ts                        ← Flag registry
    content-types.ts                        ← Content type registry
    extensions\
      registry.ts                           ← ExtensionRegistry + no-op defaults
      ad-provider.ts                        ← Interface + no-op
      billing-provider.ts                   ← Interface + no-op
      domain-attach-provider.ts             ← Interface + no-op
  prisma\
    schema.prisma                           ← Account, tenant, membership minimal models
    migrations\
      <ts>_initial\migration.sql
  tests\
    unit\
      db.test.ts                            ← Tenant-injection unit test
      permissions.test.ts                   ← Permission helper tests
      config.test.ts                        ← Config resolution test
    integration\
      tenant-isolation.test.ts              ← RLS + tenant filter integration
  docs\
    AGENTS.md                               ← Multi-agent dev workflow
    self-host.md                            ← Self-host instructions stub
  scripts\
    seed.ts                                 ← Seed two hard-coded tenants
  .env.example
  .gitignore
  .nvmrc                                    ← Node 20
  pnpm-workspace.yaml
  package.json
  tsconfig.json
  next.config.ts
  tailwind.config.ts
  postcss.config.mjs
  vitest.config.ts
  LICENSE                                   ← AGPL-3.0
  README.md
  CONTRIBUTING.md
  SECURITY.md
  Dockerfile                                ← Production image
  docker-compose.yml                        ← VPS deploy stack
  CHANGELOG.md
```

And the private sister repo:

```
C:\Projects\platform-paid\                  ← Closed overlay (private)
  package.json                              ← Workspace sibling of platform/
  src\
    register.ts                             ← Calls ExtensionRegistry.register(...)
  config\plans\paid.yaml                    ← Paid-tier defaults
  README.md                                 ← Internal: how hosted deploy works
```

VPS configuration:

```
or9space-prod (Hetzner CX22 VPS, Ubuntu 24.04)
  /opt/platform/
    docker-compose.yml                      ← Pulled from repo
    .env                                    ← Production secrets (not in git)
  /etc/cloudflared/
    config.yml                              ← CF Tunnel config
    cert.pem                                ← CF auth
```

---

## Prerequisites (manual, complete before starting tasks)

These need real-world setup that can't be automated from this plan:

- [ ] **GitHub org or account ready.** Decide if `or9space` is a personal account namespace or a GitHub org. (Free org works either way; "personal" suffices.)
- [ ] **Hetzner Cloud account.** Sign up at hetzner.com/cloud. Add a payment method. Note: Hetzner needs ID verification on first signup (15-min wait typical).
- [ ] **Cloudflare account with `or9.space` already added.** Confirm CF dashboard shows `or9.space` zone (you said you own the domain).
- [ ] **Supabase account with a free-tier project.** Create a new project named `or9space-dev` (any region; pick nearest). Note the connection string, anon key, service-role key.
- [ ] **Resend account.** Add `or9.space` as a verified domain (adds 3 DKIM CNAMEs + SPF TXT to CF DNS). API key in hand.
- [ ] **Discord Developer Portal app.** Create an OAuth app for `or9space-dev`. Redirect URI: `http://localhost:3000/api/auth/callback/discord`. Client ID + secret in hand.
- [ ] **Local toolchain.** Node 20 LTS via nvm, pnpm 9+, Git for Windows, Docker Desktop (for local image build only), PowerShell 7+.

Do not start the tasks below until these are all done.

---

## Task 1: Create the OSS platform repo on GitHub

**Files:**
- Create: GitHub repo `<your-account>/platform` (public, AGPL-3.0)
- Local clone: `C:\Projects\platform`

- [ ] **Step 1: Create the public GitHub repo**

Go to https://github.com/new. Owner: your account. Name: `platform`. Description: "or9.space — multi-tenant SaaS platform for Star Citizen orgs (open core)." Visibility: Public. Initialize with: License = "GNU Affero General Public License v3.0", `.gitignore` = "Node", no README (we'll write our own).

- [ ] **Step 2: Clone locally**

Run in PowerShell:

```powershell
cd C:\Projects
git clone https://github.com/<your-account>/platform.git
cd platform
```

Expected: empty repo with `LICENSE` and `.gitignore` already present.

- [ ] **Step 3: Verify license**

Run:

```powershell
Get-Content LICENSE | Select-Object -First 3
```

Expected output begins with:

```
                    GNU AFFERO GENERAL PUBLIC LICENSE
                       Version 3, 19 November 2007
```

If wrong license, fix via GitHub web UI → Settings → delete + recreate with correct license.

- [ ] **Step 4: Set git user for this repo (matches your global config)**

Verify:

```powershell
git config user.name
git config user.email
```

Expected: shows your usual name + email. If empty, set per-repo:

```powershell
git config user.name "David Smereski"
git config user.email "dsmereski@gmail.com"
```

No commit needed yet.

---

## Task 2: Bootstrap Next 16 + TypeScript + Tailwind

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.nvmrc`, `pnpm-workspace.yaml`

- [ ] **Step 1: Set Node version**

Run:

```powershell
"20" | Out-File -FilePath .nvmrc -Encoding utf8 -NoNewline
node --version
```

Expected: `v20.x.x`. If not, install Node 20 LTS via nvm-windows.

- [ ] **Step 2: Initialize pnpm workspace**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - .
```

Run:

```powershell
pnpm init
```

Then replace the generated `package.json` with:

```json
{
  "name": "platform",
  "version": "0.0.1",
  "private": true,
  "license": "AGPL-3.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Install Next 16 + React 19**

Run:

```powershell
pnpm add next@16 react@19 react-dom@19
pnpm add -D typescript @types/node @types/react @types/react-dom
```

Expected: `node_modules/` created, no errors. `package.json` shows next@16, react@19.

- [ ] **Step 4: Create `tsconfig.json`**

Write:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Create `next.config.ts`**

Write:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
```

- [ ] **Step 6: Install Tailwind v4**

Run:

```powershell
pnpm add -D tailwindcss@next @tailwindcss/postcss postcss
```

- [ ] **Step 7: Create Tailwind + PostCSS configs**

Create `postcss.config.mjs`:

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

Create `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: { extend: {} },
};

export default config;
```

- [ ] **Step 8: Create app skeleton**

Create `app/globals.css`:

```css
@import "tailwindcss";

html, body { height: 100%; }
body { background: #0a0a0a; color: #f5f5f5; font-family: system-ui, sans-serif; }
```

Create `app/layout.tsx`:

```tsx
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "or9.space",
  description: "Multi-tenant org platform for Star Citizen crews",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-xl space-y-4 text-center">
        <h1 className="text-4xl font-bold">or9.space</h1>
        <p className="text-neutral-400">
          The org HQ for serious Star Citizen crews. Coming soon.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 9: Verify dev server starts**

Run:

```powershell
pnpm dev
```

Open `http://localhost:3000` in a browser. Expected: black page with "or9.space" headline.

Kill the server with Ctrl+C.

- [ ] **Step 10: Commit**

Run:

```powershell
git add -A
git commit -m "feat(bootstrap): Next 16 + Tailwind v4 + TypeScript skeleton"
```

---

## Task 3: Add Vitest + first passing test

**Files:**
- Create: `vitest.config.ts`, `tests/unit/sanity.test.ts`

- [ ] **Step 1: Install Vitest**

Run:

```powershell
pnpm add -D vitest @vitest/coverage-v8 happy-dom
```

- [ ] **Step 2: Create `vitest.config.ts`**

Write:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: false,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules/", "tests/", "*.config.*"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 3: Write failing sanity test**

Create `tests/unit/sanity.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("can do math", () => {
    expect(2 + 2).toBe(4);
  });

  it("can import from @", async () => {
    const mod = await import("@/app/page");
    expect(typeof mod.default).toBe("function");
  });
});
```

- [ ] **Step 4: Run the test**

Run:

```powershell
pnpm test
```

Expected: 2 tests PASS in `tests/unit/sanity.test.ts`.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "test: add Vitest with sanity baseline"
```

---

## Task 4: Set up Prisma + minimal schema (account, tenant, membership)

**Files:**
- Create: `prisma/schema.prisma`, `.env.example`, `.env`
- Modify: `package.json` (prisma scripts)

- [ ] **Step 1: Install Prisma**

Run:

```powershell
pnpm add -D prisma
pnpm add @prisma/client
```

- [ ] **Step 2: Initialize Prisma**

Run:

```powershell
pnpm exec prisma init --datasource-provider postgresql
```

Expected: creates `prisma/schema.prisma` and `.env`.

- [ ] **Step 3: Replace `prisma/schema.prisma` with the minimal Phase 0 schema**

Write:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// === Global (no tenant_id) ===

model Account {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String?  @map("password_hash")
  displayName  String?  @map("display_name") @db.VarChar(120)
  avatarUrl    String?  @map("avatar_url") @db.VarChar(500)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  memberships  Membership[]

  @@map("accounts")
}

enum TenantStatus {
  PENDING
  PROVISIONING
  LIVE
  SUSPENDED
  ARCHIVED
}

enum TenantPlan {
  FREE
  PAID
}

model Tenant {
  id           String       @id @default(cuid())
  slug         String       @unique @db.VarChar(60)
  name         String       @db.VarChar(120)
  plan         TenantPlan   @default(FREE)
  status       TenantStatus @default(LIVE)
  customDomain String?      @unique @map("custom_domain") @db.VarChar(200)
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  memberships  Membership[]

  @@map("tenants")
}

model Membership {
  id           String   @id @default(cuid())
  accountId    String   @map("account_id")
  tenantId     String   @map("tenant_id")
  username     String   @db.VarChar(60)
  displayName  String?  @map("display_name") @db.VarChar(120)
  createdAt    DateTime @default(now()) @map("created_at")

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)
  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, username])
  @@unique([accountId, tenantId])
  @@index([tenantId])
  @@map("memberships")
}
```

- [ ] **Step 4: Set local DB URL**

Edit `.env` to add the Supabase connection string from prerequisites:

```
DATABASE_URL="postgresql://postgres.<ref>:<password>@<host>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<password>@<host>.pooler.supabase.com:5432/postgres"
```

(Get the strings from Supabase dashboard → Project Settings → Database → Connection string. Use "Pooler" for `DATABASE_URL`, "Direct" for `DIRECT_URL`.)

Update `prisma/schema.prisma` datasource block:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- [ ] **Step 5: Create `.env.example`**

Write:

```
# Database
DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host:5432/db"

# NextAuth
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# Discord OAuth
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""

# Resend
RESEND_API_KEY=""
RESEND_FROM_EMAIL="hello@or9.space"

# Cloudflare R2 (storage)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET=""

# Platform admin
PLATFORM_ADMIN_EMAILS="dsmereski@gmail.com"
```

- [ ] **Step 6: Run the first migration**

Run:

```powershell
pnpm exec prisma migrate dev --name initial_account_tenant_membership
```

Expected: creates `prisma/migrations/<ts>_initial_account_tenant_membership/migration.sql`, applies to Supabase. Output: "Your database is now in sync with your schema."

- [ ] **Step 7: Generate Prisma client**

Run:

```powershell
pnpm exec prisma generate
```

Expected: "Generated Prisma Client".

- [ ] **Step 8: Add `.env` to `.gitignore`**

Verify `.gitignore` already excludes `.env`. If not, append:

```
.env
.env*.local
```

- [ ] **Step 9: Add Prisma scripts to `package.json`**

Add to the `scripts` block:

```json
"db:migrate": "prisma migrate dev",
"db:generate": "prisma generate",
"db:studio": "prisma studio",
"db:reset": "prisma migrate reset --skip-seed"
```

- [ ] **Step 10: Commit**

```powershell
git add -A
git commit -m "feat(db): initial Prisma schema (account, tenant, membership)"
```

---

## Task 5: Build `lib/db.ts` tenant-aware indirection (TDD)

**Files:**
- Create: `lib/db.ts`, `lib/tenant.ts`, `tests/unit/db.test.ts`

This is the heart of the row-level multi-tenancy. The proxy auto-injects `tenant_id` in WHERE clauses for tenant-scoped models and rejects access to direct Prisma.

- [ ] **Step 1: Write the failing test first**

Create `tests/unit/db.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

const findManyMock = vi.fn(async () => [{ id: "x" }]);
const createMock = vi.fn(async (args: { data: Record<string, unknown> }) => args.data);

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    membership: { findMany: findManyMock, create: createMock },
    account: { findMany: findManyMock, create: createMock },
  })),
}));

import { db, GLOBAL_TABLES } from "@/lib/db";

describe("db tenant indirection", () => {
  it("auto-injects tenant_id in findMany WHERE for tenant-scoped tables", async () => {
    const tenantCtx = { tenantId: "alpha" };
    await db(tenantCtx).membership.findMany({ where: { username: "joe" } });
    expect(findManyMock).toHaveBeenCalledWith({
      where: { username: "joe", tenantId: "alpha" },
    });
  });

  it("auto-injects tenant_id in create data for tenant-scoped tables", async () => {
    const tenantCtx = { tenantId: "alpha" };
    await db(tenantCtx).membership.create({
      data: { accountId: "a1", username: "joe", displayName: "Joe" },
    });
    expect(createMock).toHaveBeenCalledWith({
      data: { accountId: "a1", username: "joe", displayName: "Joe", tenantId: "alpha" },
    });
  });

  it("does NOT inject tenant_id for global tables", async () => {
    findManyMock.mockClear();
    const tenantCtx = { tenantId: "alpha" };
    await db(tenantCtx).account.findMany({ where: { email: "x@y" } });
    expect(findManyMock).toHaveBeenCalledWith({ where: { email: "x@y" } });
  });

  it("exposes the GLOBAL_TABLES whitelist", () => {
    expect(GLOBAL_TABLES).toContain("account");
    expect(GLOBAL_TABLES).toContain("tenant");
    expect(GLOBAL_TABLES).not.toContain("membership");
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
pnpm test
```

Expected: 4 tests in `db.test.ts` FAIL (module not found).

- [ ] **Step 3: Write `lib/tenant.ts`**

Create `lib/tenant.ts`:

```ts
export interface TenantContext {
  tenantId: string;
}

export function makeTenantContext(tenantId: string): TenantContext {
  if (!tenantId || typeof tenantId !== "string") {
    throw new Error("makeTenantContext: tenantId must be a non-empty string");
  }
  return { tenantId };
}
```

- [ ] **Step 4: Write `lib/db.ts`**

Create `lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import type { TenantContext } from "./tenant";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Tables that live above tenancy (no tenant_id column). Calls against these
 * pass through unmodified. Any other model lookup auto-injects tenant_id.
 */
export const GLOBAL_TABLES = [
  "account",
  "accountOauth",
  "tenant",
  "pendingTenant",
  "tenantConfig",
  "tenantFeatureFlag",
  "supportTicket",
  "supportMessage",
  "adSlot",
  "adCreative",
] as const;

type ModelName = keyof PrismaClient & string;
type Operation = "findMany" | "findFirst" | "findUnique" | "count" | "aggregate"
               | "create" | "createMany" | "update" | "updateMany"
               | "upsert" | "delete" | "deleteMany";

const READ_OPS: Operation[] = [
  "findMany", "findFirst", "findUnique", "count", "aggregate",
  "update", "updateMany", "delete", "deleteMany", "upsert"
];
const WRITE_DATA_OPS: Operation[] = ["create", "createMany", "upsert"];

function injectTenantId(
  op: Operation,
  args: Record<string, unknown> | undefined,
  tenantId: string,
): Record<string, unknown> {
  const a = args ?? {};
  if (READ_OPS.includes(op)) {
    return { ...a, where: { ...(a.where as object ?? {}), tenantId } };
  }
  if (WRITE_DATA_OPS.includes(op)) {
    const data = a.data as Record<string, unknown> | undefined;
    if (Array.isArray(data)) {
      return { ...a, data: data.map((d) => ({ ...d, tenantId })) };
    }
    return { ...a, data: { ...(data ?? {}), tenantId } };
  }
  return a;
}

export function db(ctx: TenantContext) {
  return new Proxy(prisma as any, {
    get(target, modelKey: ModelName) {
      const model = target[modelKey];
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

/**
 * Direct prisma access for global-only queries from infrastructure code.
 * Application code MUST use db(ctx) — enforced by the no-untenanted-query
 * ESLint rule.
 */
export const prismaGlobal = prisma;
```

- [ ] **Step 5: Run the tests**

Run:

```powershell
pnpm test
```

Expected: 4 tests in `db.test.ts` PASS.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat(db): tenant-aware Prisma proxy with global-table whitelist"
```

---

## Task 6: Build `lib/permissions.ts` helpers (TDD)

**Files:**
- Create: `lib/permissions.ts`, `tests/unit/permissions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/permissions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { tierRank, hasTier, type RankTier } from "@/lib/permissions";

describe("tier helpers", () => {
  it("ranks tiers in the correct order", () => {
    expect(tierRank("ENLISTED")).toBe(0);
    expect(tierRank("NCO")).toBe(1);
    expect(tierRank("OFFICER")).toBe(2);
    expect(tierRank("COMMAND")).toBe(3);
  });

  it("hasTier returns true when actor meets or exceeds required", () => {
    expect(hasTier("OFFICER", "NCO")).toBe(true);
    expect(hasTier("COMMAND", "OFFICER")).toBe(true);
    expect(hasTier("ENLISTED", "ENLISTED")).toBe(true);
  });

  it("hasTier returns false when actor is below required", () => {
    expect(hasTier("ENLISTED", "OFFICER")).toBe(false);
    expect(hasTier("NCO", "COMMAND")).toBe(false);
  });

  it("hasTier handles null actor tier", () => {
    expect(hasTier(null, "ENLISTED")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
pnpm test
```

Expected: 4 tests in `permissions.test.ts` FAIL (module not found).

- [ ] **Step 3: Implement `lib/permissions.ts`**

Create `lib/permissions.ts`:

```ts
export type RankTier = "ENLISTED" | "NCO" | "OFFICER" | "COMMAND";

const TIER_ORDER: Record<RankTier, number> = {
  ENLISTED: 0,
  NCO: 1,
  OFFICER: 2,
  COMMAND: 3,
};

export function tierRank(tier: RankTier): number {
  return TIER_ORDER[tier];
}

export function hasTier(actor: RankTier | null, required: RankTier): boolean {
  if (actor === null) return false;
  return tierRank(actor) >= tierRank(required);
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class FeatureDisabledError extends Error {
  constructor(feature: string) {
    super(`Feature '${feature}' is disabled for this tenant`);
    this.name = "FeatureDisabledError";
  }
}
```

- [ ] **Step 4: Run the tests**

Run:

```powershell
pnpm test
```

Expected: 4 tests in `permissions.test.ts` PASS.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat(permissions): RankTier helpers + Forbidden/FeatureDisabled errors"
```

---

## Task 7: Build the feature flag registry (TDD)

**Files:**
- Create: `lib/feature-flags.ts`, `tests/unit/feature-flags.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/feature-flags.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { FEATURE_FLAGS, isValidFlagKey, type FeatureFlagKey } from "@/lib/feature-flags";

describe("feature flag registry", () => {
  it("declares all 10 v1 flags", () => {
    expect(FEATURE_FLAGS).toHaveLength(10);
  });

  it("includes the locked flag keys", () => {
    const keys = FEATURE_FLAGS.map((f) => f.key);
    for (const expected of [
      "forums", "handbook", "loot", "inventory", "treasury",
      "fleet", "tournaments", "calendar.googleIntegration",
      "discord.bot", "ads"
    ]) {
      expect(keys).toContain(expected);
    }
  });

  it("ads is platform-controlled (not tenant-editable)", () => {
    const ads = FEATURE_FLAGS.find((f) => f.key === "ads");
    expect(ads?.tenantEditable).toBe(false);
  });

  it("discord.bot requires paid tier", () => {
    const discord = FEATURE_FLAGS.find((f) => f.key === "discord.bot");
    expect(discord?.paidOnly).toBe(true);
  });

  it("isValidFlagKey accepts only declared flags", () => {
    expect(isValidFlagKey("forums")).toBe(true);
    expect(isValidFlagKey("not-a-flag")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing test**

```powershell
pnpm test
```

Expected: 5 tests in `feature-flags.test.ts` FAIL.

- [ ] **Step 3: Implement `lib/feature-flags.ts`**

Create `lib/feature-flags.ts`:

```ts
export interface FeatureFlagDef {
  key: FeatureFlagKey;
  label: string;
  defaultFree: boolean;
  defaultPaid: boolean;
  tenantEditable: boolean;
  paidOnly: boolean;
}

export type FeatureFlagKey =
  | "forums"
  | "handbook"
  | "loot"
  | "inventory"
  | "treasury"
  | "fleet"
  | "tournaments"
  | "calendar.googleIntegration"
  | "discord.bot"
  | "ads";

export const FEATURE_FLAGS: ReadonlyArray<FeatureFlagDef> = [
  { key: "forums",                      label: "Forums",            defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "handbook",                    label: "Handbook",          defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "loot",                        label: "Loot Points",       defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "inventory",                   label: "Inventory",         defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "treasury",                    label: "Treasury",          defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "fleet",                       label: "Fleet",             defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "tournaments",                 label: "Tournaments",       defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "calendar.googleIntegration",  label: "Google Calendar",   defaultFree: true,  defaultPaid: true,  tenantEditable: true,  paidOnly: false },
  { key: "discord.bot",                 label: "Discord Bot",       defaultFree: false, defaultPaid: true,  tenantEditable: true,  paidOnly: true },
  { key: "ads",                         label: "Ads",               defaultFree: true,  defaultPaid: false, tenantEditable: false, paidOnly: false },
];

const FLAG_KEY_SET: ReadonlySet<string> = new Set(FEATURE_FLAGS.map((f) => f.key));

export function isValidFlagKey(key: string): key is FeatureFlagKey {
  return FLAG_KEY_SET.has(key);
}
```

- [ ] **Step 4: Run the tests**

```powershell
pnpm test
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat(flags): feature flag registry with 10 v1 flags"
```

---

## Task 8: Build the content type registry (TDD)

**Files:**
- Create: `lib/content-types.ts`, `tests/unit/content-types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/content-types.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  CONTENT_TYPES,
  CUSTOM_FIELD_ELIGIBLE_TYPES,
  isCustomFieldEligible,
} from "@/lib/content-types";

describe("content type registry", () => {
  it("declares 25 content types", () => {
    expect(CONTENT_TYPES.length).toBe(25);
  });

  it("declares 9 custom-field-eligible types", () => {
    expect(CUSTOM_FIELD_ELIGIBLE_TYPES.length).toBe(9);
  });

  it("forum_thread is custom-field-eligible", () => {
    expect(isCustomFieldEligible("forum_thread")).toBe(true);
  });

  it("forum_post is NOT custom-field-eligible (sub-table)", () => {
    expect(isCustomFieldEligible("forum_post")).toBe(false);
  });

  it("each content type maps to a feature flag", () => {
    for (const ct of CONTENT_TYPES) {
      expect(ct.featureFlag).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run the failing test**

```powershell
pnpm test
```

Expected: 5 tests FAIL.

- [ ] **Step 3: Implement `lib/content-types.ts`**

Create `lib/content-types.ts`:

```ts
import type { FeatureFlagKey } from "./feature-flags";

export interface ContentTypeDef {
  name: ContentTypeName;
  featureFlag: FeatureFlagKey;
  customFieldEligible: boolean;
}

export type ContentTypeName =
  | "forum_thread" | "forum_post"
  | "handbook" | "handbook_section" | "signoff_category" | "signoff_item" | "signoff_signature" | "handbook_ack"
  | "loot_member" | "loot_session" | "loot_attendance" | "loot_transaction"
  | "org_item_catalog" | "org_item_instance" | "org_item_event" | "org_item_loan" | "personal_org_item_entry" | "org_item_request"
  | "treasury_entry" | "treasury_category"
  | "ship" | "hangar_slot"
  | "tournament" | "tournament_bracket" | "tournament_registration";

export const CONTENT_TYPES: ReadonlyArray<ContentTypeDef> = [
  { name: "forum_thread",            featureFlag: "forums",      customFieldEligible: true  },
  { name: "forum_post",              featureFlag: "forums",      customFieldEligible: false },
  { name: "handbook",                featureFlag: "handbook",    customFieldEligible: false },
  { name: "handbook_section",        featureFlag: "handbook",    customFieldEligible: true  },
  { name: "signoff_category",        featureFlag: "handbook",    customFieldEligible: false },
  { name: "signoff_item",            featureFlag: "handbook",    customFieldEligible: true  },
  { name: "signoff_signature",       featureFlag: "handbook",    customFieldEligible: false },
  { name: "handbook_ack",            featureFlag: "handbook",    customFieldEligible: false },
  { name: "loot_member",             featureFlag: "loot",        customFieldEligible: false },
  { name: "loot_session",            featureFlag: "loot",        customFieldEligible: true  },
  { name: "loot_attendance",         featureFlag: "loot",        customFieldEligible: false },
  { name: "loot_transaction",        featureFlag: "loot",        customFieldEligible: false },
  { name: "org_item_catalog",        featureFlag: "inventory",   customFieldEligible: true  },
  { name: "org_item_instance",       featureFlag: "inventory",   customFieldEligible: false },
  { name: "org_item_event",          featureFlag: "inventory",   customFieldEligible: false },
  { name: "org_item_loan",           featureFlag: "inventory",   customFieldEligible: false },
  { name: "personal_org_item_entry", featureFlag: "inventory",   customFieldEligible: true  },
  { name: "org_item_request",        featureFlag: "inventory",   customFieldEligible: false },
  { name: "treasury_entry",          featureFlag: "treasury",    customFieldEligible: true  },
  { name: "treasury_category",       featureFlag: "treasury",    customFieldEligible: false },
  { name: "ship",                    featureFlag: "fleet",       customFieldEligible: true  },
  { name: "hangar_slot",             featureFlag: "fleet",       customFieldEligible: false },
  { name: "tournament",              featureFlag: "tournaments", customFieldEligible: true  },
  { name: "tournament_bracket",      featureFlag: "tournaments", customFieldEligible: false },
  { name: "tournament_registration", featureFlag: "tournaments", customFieldEligible: false },
];

export const CUSTOM_FIELD_ELIGIBLE_TYPES = CONTENT_TYPES.filter(
  (t) => t.customFieldEligible,
).map((t) => t.name);

const ELIGIBLE_SET: ReadonlySet<string> = new Set(CUSTOM_FIELD_ELIGIBLE_TYPES);

export function isCustomFieldEligible(name: string): boolean {
  return ELIGIBLE_SET.has(name);
}
```

- [ ] **Step 4: Run the tests**

```powershell
pnpm test
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat(content-types): registry of 25 types + 9 custom-field-eligible"
```

---

## Task 9: Build the ExtensionRegistry (open-core overlay seam)

**Files:**
- Create: `lib/extensions/registry.ts`, `lib/extensions/ad-provider.ts`, `lib/extensions/billing-provider.ts`, `lib/extensions/domain-attach-provider.ts`, `tests/unit/extensions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/extensions.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { ExtensionRegistry } from "@/lib/extensions/registry";
import { noOpAdProvider } from "@/lib/extensions/ad-provider";

describe("ExtensionRegistry", () => {
  let ext: ExtensionRegistry;
  beforeEach(() => { ext = new ExtensionRegistry(); });

  it("starts with no-op defaults", () => {
    expect(ext.adProvider).toBe(noOpAdProvider);
    expect(ext.billingProvider.kind).toBe("noop");
    expect(ext.domainAttachProvider.kind).toBe("noop");
  });

  it("allows registering a real provider", () => {
    const fake = { kind: "fake" as const, serve: async () => ({ html: "<p>ad</p>" }) };
    ext.register("adProvider", fake);
    expect(ext.adProvider).toBe(fake);
  });

  it("isExtended() returns true when any non-default provider is registered", () => {
    expect(ext.isExtended()).toBe(false);
    ext.register("adProvider", { kind: "fake" as any, serve: async () => ({ html: "" }) });
    expect(ext.isExtended()).toBe(true);
  });
});
```

- [ ] **Step 2: Run the failing test**

```powershell
pnpm test
```

Expected: 3 tests FAIL.

- [ ] **Step 3: Implement the provider interfaces**

Create `lib/extensions/ad-provider.ts`:

```ts
export interface AdProvider {
  kind: "noop" | "house" | "network";
  serve(slot: string, tenantId: string): Promise<{ html: string } | null>;
}

export const noOpAdProvider: AdProvider = {
  kind: "noop",
  serve: async () => null,
};
```

Create `lib/extensions/billing-provider.ts`:

```ts
export interface BillingProvider {
  kind: "noop" | "stripe";
  createCheckoutSession(args: { tenantId: string; priceId: string }): Promise<{ url: string } | null>;
  cancelSubscription(args: { tenantId: string }): Promise<{ ok: boolean }>;
}

export const noOpBillingProvider: BillingProvider = {
  kind: "noop",
  createCheckoutSession: async () => null,
  cancelSubscription: async () => ({ ok: false }),
};
```

Create `lib/extensions/domain-attach-provider.ts`:

```ts
export interface DomainAttachProvider {
  kind: "noop" | "cf-ssl-for-saas";
  attach(args: { tenantId: string; hostname: string }): Promise<{ status: "pending" | "failed" }>;
  detach(args: { tenantId: string; hostname: string }): Promise<{ ok: boolean }>;
  checkStatus(args: { hostname: string }): Promise<{ status: "pending" | "verifying" | "active" | "failing" }>;
}

export const noOpDomainAttachProvider: DomainAttachProvider = {
  kind: "noop",
  attach: async () => ({ status: "failed" }),
  detach: async () => ({ ok: false }),
  checkStatus: async () => ({ status: "failing" }),
};
```

- [ ] **Step 4: Implement `lib/extensions/registry.ts`**

Create `lib/extensions/registry.ts`:

```ts
import { type AdProvider, noOpAdProvider } from "./ad-provider";
import { type BillingProvider, noOpBillingProvider } from "./billing-provider";
import { type DomainAttachProvider, noOpDomainAttachProvider } from "./domain-attach-provider";

type Slots = {
  adProvider: AdProvider;
  billingProvider: BillingProvider;
  domainAttachProvider: DomainAttachProvider;
};

export class ExtensionRegistry {
  adProvider: AdProvider = noOpAdProvider;
  billingProvider: BillingProvider = noOpBillingProvider;
  domainAttachProvider: DomainAttachProvider = noOpDomainAttachProvider;

  register<K extends keyof Slots>(slot: K, impl: Slots[K]): void {
    this[slot] = impl;
  }

  isExtended(): boolean {
    return this.adProvider.kind !== "noop"
        || this.billingProvider.kind !== "noop"
        || this.domainAttachProvider.kind !== "noop";
  }
}

/** Singleton consumed by app code. platform-paid registers real impls here. */
export const ext = new ExtensionRegistry();
```

- [ ] **Step 5: Run the tests**

```powershell
pnpm test
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat(extensions): ExtensionRegistry + 3 no-op provider interfaces"
```

---

## Task 10: Build the config schema scaffold (Zod) + resolution

**Files:**
- Create: `lib/config/schema.ts`, `lib/config/defaults.yaml`, `lib/config/plans/free.yaml`, `lib/config/index.ts`, `tests/unit/config.test.ts`

- [ ] **Step 1: Install zod + js-yaml**

```powershell
pnpm add zod js-yaml
pnpm add -D @types/js-yaml
```

- [ ] **Step 2: Write the failing test**

Create `tests/unit/config.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ConfigSchema, resolveConfigFromValues } from "@/lib/config/schema";
import { loadPlatformDefaults, loadPlanDefaults } from "@/lib/config";

describe("config schema", () => {
  it("parses a minimal valid config", () => {
    const result = ConfigSchema.safeParse({
      branding: { name: "Test", preset: "tactical-dark" },
      labels: {},
      features: {
        forums: true, handbook: true, loot: true, inventory: true, treasury: true,
        fleet: false, tournaments: false,
        "calendar.googleIntegration": true, "discord.bot": false, ads: true,
      },
      integrations: {},
      customFields: {},
      domains: { customDomain: null, customDomainStatus: null },
      ads: { slots: ["sidebar-bottom"], fallbackHouseAd: true },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown feature flag", () => {
    const result = ConfigSchema.safeParse({
      branding: { name: "Test", preset: "tactical-dark" },
      labels: {},
      features: { madeUpFlag: true },
      integrations: {},
      customFields: {},
      domains: { customDomain: null, customDomainStatus: null },
      ads: { slots: [], fallbackHouseAd: true },
    });
    expect(result.success).toBe(false);
  });
});

describe("config resolution", () => {
  it("loads platform defaults yaml", async () => {
    const d = await loadPlatformDefaults();
    expect(d.branding.name).toBeDefined();
    expect(d.features).toBeDefined();
  });

  it("loads free plan yaml", async () => {
    const d = await loadPlanDefaults("FREE");
    expect(d).toBeDefined();
  });

  it("merges layers with deepest winning", () => {
    const platform = { branding: { name: "Platform", preset: "tactical-dark" } };
    const plan = { features: { fleet: false } };
    const tenant = { branding: { name: "Tenant Override" } };
    const merged = resolveConfigFromValues(platform, plan, tenant);
    expect(merged.branding?.name).toBe("Tenant Override");
    expect(merged.features?.fleet).toBe(false);
  });
});
```

- [ ] **Step 3: Run the failing test**

```powershell
pnpm test
```

Expected: 5 tests FAIL.

- [ ] **Step 4: Implement `lib/config/schema.ts`**

Create `lib/config/schema.ts`:

```ts
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
  logoUrl: z.string().url().nullable().default(null),
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
```

- [ ] **Step 5: Create the YAML files**

Create `lib/config/defaults.yaml`:

```yaml
branding:
  name: "or9.space tenant"
  preset: tactical-dark
  fontHeading: Oswald
  fontBody: Lora
labels:
  memberSingular: Member
  memberPlural: Members
  branchSingular: Branch
  branchPlural: Branches
  handbookNoun: Field Handbook
  currencyCode: aUEC
features:
  forums: true
  handbook: true
  loot: true
  inventory: true
  treasury: true
  fleet: false
  tournaments: false
  "calendar.googleIntegration": true
  "discord.bot": false
  ads: true
integrations:
  discord: null
  googleCalendar: null
customFields: {}
domains:
  customDomain: null
  customDomainStatus: null
ads:
  slots: ["sidebar-bottom"]
  fallbackHouseAd: true
```

Create `lib/config/plans/free.yaml`:

```yaml
features:
  ads: true
  fleet: false
  tournaments: false
  "discord.bot": false
```

- [ ] **Step 6: Implement `lib/config/index.ts`**

Create `lib/config/index.ts`:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { ConfigSchema, resolveConfigFromValues, type TenantConfig } from "./schema";
import type { TenantPlan } from "@prisma/client";

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
```

- [ ] **Step 7: Run the tests**

```powershell
pnpm test
```

Expected: 5 tests PASS.

- [ ] **Step 8: Commit**

```powershell
git add -A
git commit -m "feat(config): zod schema + git-layered defaults + plan resolution"
```

---

## Task 11: Build the middleware for tenant resolution

**Files:**
- Create: `middleware.ts`, `lib/tenant-resolver.ts`, `tests/unit/tenant-resolver.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/tenant-resolver.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { tenantSlugFromHost } from "@/lib/tenant-resolver";

describe("tenantSlugFromHost", () => {
  it("extracts slug from <slug>.or9.space", () => {
    expect(tenantSlugFromHost("freedomguards.or9.space")).toBe("freedomguards");
    expect(tenantSlugFromHost("demo.or9.space")).toBe("demo");
  });

  it("returns null for root or9.space", () => {
    expect(tenantSlugFromHost("or9.space")).toBeNull();
    expect(tenantSlugFromHost("www.or9.space")).toBeNull();
  });

  it("returns null for reserved subdomains", () => {
    expect(tenantSlugFromHost("admin.or9.space")).toBeNull();
    expect(tenantSlugFromHost("support.or9.space")).toBeNull();
    expect(tenantSlugFromHost("api.or9.space")).toBeNull();
  });

  it("ignores port", () => {
    expect(tenantSlugFromHost("demo.or9.space:3000")).toBe("demo");
  });

  it("handles localhost dev with subdomain pattern", () => {
    expect(tenantSlugFromHost("demo.localhost:3000")).toBe("demo");
  });
});
```

- [ ] **Step 2: Run the failing test**

```powershell
pnpm test
```

Expected: 5 tests FAIL.

- [ ] **Step 3: Implement `lib/tenant-resolver.ts`**

Create `lib/tenant-resolver.ts`:

```ts
const RESERVED_SUBDOMAINS = new Set(["www", "admin", "support", "api", "demo-staging"]);
const PLATFORM_ROOTS = ["or9.space", "localhost"];

export function tenantSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const noPort = host.split(":")[0];
  for (const root of PLATFORM_ROOTS) {
    if (noPort === root || noPort === "www." + root) return null;
    const suffix = "." + root;
    if (noPort.endsWith(suffix)) {
      const sub = noPort.slice(0, -suffix.length);
      if (!sub) return null;
      if (RESERVED_SUBDOMAINS.has(sub)) return null;
      if (sub.includes(".")) return null;
      return sub;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run the tests**

```powershell
pnpm test
```

Expected: 5 tests PASS.

- [ ] **Step 5: Implement `middleware.ts`**

Create `middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { tenantSlugFromHost } from "@/lib/tenant-resolver";

export function middleware(req: NextRequest) {
  const cfTenant = req.headers.get("x-or9-tenant");
  const slug = cfTenant?.trim() || tenantSlugFromHost(req.headers.get("host"));

  const res = NextResponse.next();
  if (slug) res.headers.set("x-or9-tenant", slug);
  return res;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|api/health).*)",
};
```

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat(tenant): middleware + slug-from-host resolver"
```

---

## Task 12: Build the hello-world tenant page

**Files:**
- Create: `app/(tenant)/page.tsx`, `lib/server/get-tenant.ts`
- Modify: `app/page.tsx` (split marketing root from tenant route)

- [ ] **Step 1: Implement `lib/server/get-tenant.ts`**

Create `lib/server/get-tenant.ts`:

```ts
import { headers } from "next/headers";
import { prismaGlobal } from "../db";

export async function getCurrentTenant() {
  const h = await headers();
  const slug = h.get("x-or9-tenant");
  if (!slug) return null;
  return await prismaGlobal.tenant.findUnique({ where: { slug } });
}
```

- [ ] **Step 2: Update `app/page.tsx` to branch on tenant presence**

Replace `app/page.tsx` with:

```tsx
import { getCurrentTenant } from "@/lib/server/get-tenant";
import { resolveTenantConfig } from "@/lib/config";

export default async function HomePage() {
  const tenant = await getCurrentTenant();

  if (!tenant) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-xl space-y-4 text-center">
          <h1 className="text-4xl font-bold">or9.space</h1>
          <p className="text-neutral-400">
            The org HQ for serious Star Citizen crews. Coming soon.
          </p>
        </div>
      </main>
    );
  }

  const cfg = await resolveTenantConfig(tenant.plan);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-xl space-y-4 text-center">
        <h1 className="text-4xl font-bold">{cfg.branding.name}</h1>
        <p className="text-neutral-400">
          Tenant: <code>{tenant.slug}</code> · Plan: <code>{tenant.plan}</code>
        </p>
        <p className="text-sm text-neutral-500">
          Phase 0 — platform skeleton. Phase 1 starts soon.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Add `app/api/health/route.ts`**

Create `app/api/health/route.ts`:

```ts
export async function GET() {
  return Response.json({ ok: true, ts: new Date().toISOString() });
}
```

- [ ] **Step 4: Seed two tenants for local dev**

Create `scripts/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.upsert({
    where: { slug: "freedomguards" },
    update: { name: "Freedom Guards", plan: "FREE", status: "LIVE" },
    create: { slug: "freedomguards", name: "Freedom Guards", plan: "FREE", status: "LIVE" },
  });
  await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: { name: "Demo Org", plan: "FREE", status: "LIVE" },
    create: { slug: "demo", name: "Demo Org", plan: "FREE", status: "LIVE" },
  });
  console.log("seeded tenants: freedomguards, demo");
}

main().finally(() => prisma.$disconnect());
```

Add to `package.json` scripts:

```json
"db:seed": "tsx scripts/seed.ts"
```

Install `tsx`:

```powershell
pnpm add -D tsx
```

Run the seed:

```powershell
pnpm db:seed
```

Expected: `seeded tenants: freedomguards, demo`.

- [ ] **Step 5: Verify locally**

Run:

```powershell
pnpm dev
```

In a browser:
- Open `http://localhost:3000` → marketing root visible.
- Open `http://demo.localhost:3000` → "Demo Org" headline + slug "demo" + plan "FREE".
- Open `http://freedomguards.localhost:3000` → "Freedom Guards" headline.

(If your browser blocks subdomain on localhost, add `127.0.0.1 demo.localhost freedomguards.localhost` to `C:\Windows\System32\drivers\etc\hosts`.)

Kill the server.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat(tenant): hello-world tenant page + 2 seeded tenants + /api/health"
```

---

## Task 13: Add LICENSE/README/CONTRIBUTING/SECURITY + Dockerfile

**Files:**
- Modify: `README.md`, `LICENSE` (verify), `CONTRIBUTING.md`, `SECURITY.md`, `Dockerfile`, `docker-compose.yml`, `docs/self-host.md`

- [ ] **Step 1: Write `README.md`**

Create `README.md`:

```md
# or9.space platform

Multi-tenant SaaS platform for Star Citizen orgs. The org HQ for serious crews — forums, handbook, sign-offs, loot points, inventory, treasury, fleet, tournaments — runs as a single Next 16 app serving any number of tenants from a single deployment.

## Hosted

Use the hosted service at <https://or9.space> — free tier with ads, paid tier removes ads + custom domain + Discord bot. No setup, no servers.

## Self-host (this repo)

```sh
git clone https://github.com/<owner>/platform.git
cd platform
pnpm install
cp .env.example .env
# edit .env to point at your Postgres + Resend + OAuth providers
pnpm db:migrate
pnpm db:seed
pnpm dev
```

See `docs/self-host.md` for production deploy.

## License

AGPL-3.0. See `LICENSE`.

`or9.space` is the hosted commercial service built on top of this repo plus a closed-source overlay (`platform-paid`). The overlay adds billing, ads, automated custom domain attach, and a managed Discord bot.

## Status

Phase 0 — platform skeleton. Not yet production-ready. See `docs/superpowers/specs/` for design + roadmap.
```

- [ ] **Step 2: Write `CONTRIBUTING.md`**

Create `CONTRIBUTING.md`:

```md
# Contributing

## Issues

Bug reports + feature requests welcome via GitHub Issues. Please:
- Search existing issues first.
- Provide reproduction steps for bugs.
- For feature requests, describe the user problem before the proposed solution.

## Pull requests

- Branch from `main`.
- One feature per PR.
- All tests + lint + typecheck must pass.
- Multi-tenant code (anything touching `tenant_id`) requires TDD — write the tenant-isolation test first.
- Keep changes scoped — refactors land separately from features.

## Code style

- TypeScript strict mode.
- Prefer small focused files (<400 lines).
- Run `pnpm lint` + `pnpm typecheck` before committing.

## License

Contributions are accepted under AGPL-3.0.
```

- [ ] **Step 3: Write `SECURITY.md`**

Create `SECURITY.md`:

```md
# Security

## Reporting a vulnerability

Please email security disclosures to **security@or9.space** rather than filing a public issue.

Provide:
- Description of the vulnerability.
- Steps to reproduce.
- Impact assessment.
- Any suggested mitigation.

We will respond within 72 hours and aim to ship a fix within 14 days for critical issues, 30 days for high-severity, and 90 days for moderate.

## Tenant isolation

This platform uses row-level multi-tenancy with `tenant_id` columns + Postgres RLS policies + an ESLint custom rule (`no-untenanted-query`) as defense in depth. Any vulnerability that allows one tenant to read or modify another tenant's data is treated as critical-severity regardless of practical exploit difficulty.
```

- [ ] **Step 4: Write the production `Dockerfile`**

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib/config ./lib/config
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

Update `next.config.ts` to enable standalone output:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: { typedRoutes: true },
};

export default nextConfig;
```

- [ ] **Step 5: Write the prod `docker-compose.yml`**

Create `docker-compose.yml`:

```yaml
services:
  next-app:
    image: ghcr.io/<your-account>/platform:latest
    restart: unless-stopped
    env_file: .env
    ports:
      - "127.0.0.1:3000:3000"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel run
    env_file: .cloudflared.env
    network_mode: "host"
```

- [ ] **Step 6: Write `docs/self-host.md`**

Create `docs/self-host.md`:

```md
# Self-host guide

This guide shows how to run the open-source `platform` build on your own infrastructure. The hosted `or9.space` service includes additional closed-source features (Stripe billing, ads, CF SSL-for-SaaS automation, managed Discord bot) that are absent here.

## Prereqs

- A Postgres database (Supabase free tier works, or your own).
- A domain you control (e.g., `myorg.example`).
- Resend account for transactional email (free tier covers small orgs).
- Discord OAuth app for sign-in.
- A small Linux VPS (1 GB RAM minimum) OR a Vercel Hobby project (non-commercial use only per Vercel TOS).

## Local dev

```sh
git clone https://github.com/<owner>/platform.git
cd platform
pnpm install
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, OAuth + Resend keys.
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Visit `http://localhost:3000`. Two seeded tenants at `demo.localhost:3000` and `freedomguards.localhost:3000`. Add these hostnames to your `hosts` file if your browser blocks them.

## Production (Linux VPS + Cloudflare Tunnel)

Recommended: $5/mo VPS (Hetzner CX22, Contabo VPS S, etc.) behind Cloudflare's free wildcard SSL.

1. Install Docker on the VPS.
2. Clone this repo to `/opt/platform`.
3. Copy `.env.example` to `.env`, fill in production secrets.
4. Set up Cloudflare Tunnel:
   - In CF dashboard → Zero Trust → Networks → Tunnels → Create.
   - Install `cloudflared` on the VPS, run the install command from the dashboard.
   - Route `*.yourdomain.com` → `http://localhost:3000`.
5. Start the stack: `docker compose up -d`.
6. Visit `https://demo.yourdomain.com` and watch the tenant home render.

## Custom domain attach

OSS self-host: manual. Add a CNAME from `yourtenant.com` → `<your-vps>.yourdomain.com`, then `INSERT INTO tenants (..., custom_domain) VALUES (..., 'yourtenant.com');`. Issue your own cert via Cloudflare or Caddy.

Hosted or9.space: one-click via CF SSL-for-SaaS (paid tier).

## Going further

The closed-source `platform-paid` overlay is not available for self-host. To replicate paid features yourself:
- Billing: integrate Stripe Checkout directly.
- Ads: serve from your own ad inventory.
- Custom-domain automation: roll your own CF API client.

If you build these and want to keep using upstream `platform`, ensure your overlay implements the `AdProvider` / `BillingProvider` / `DomainAttachProvider` interfaces (`lib/extensions/*-provider.ts`) and registers via `ExtensionRegistry.register(...)` at module-load time.
```

- [ ] **Step 7: Verify production build works locally**

Run:

```powershell
pnpm build
```

Expected: "Compiled successfully", with `.next/standalone/` produced.

- [ ] **Step 8: Commit**

```powershell
git add -A
git commit -m "docs+infra: README, CONTRIBUTING, SECURITY, Dockerfile, self-host docs"
```

---

## Task 14: Set up GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: platform_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/platform_test
          DIRECT_URL: postgres://postgres:postgres@localhost:5432/platform_test
        run: pnpm exec prisma generate

      - name: Migrate test DB
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/platform_test
          DIRECT_URL: postgres://postgres:postgres@localhost:5432/platform_test
        run: pnpm exec prisma migrate deploy

      - run: pnpm typecheck

      - run: pnpm test
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/platform_test
          DIRECT_URL: postgres://postgres:postgres@localhost:5432/platform_test
```

- [ ] **Step 2: Commit, push, watch CI**

```powershell
git add -A
git commit -m "ci: GitHub Actions running typecheck + tests against ephemeral Postgres"
git push -u origin main
```

In the GitHub UI, open the Actions tab. Expected: CI run starts within 30s. After 2-3 minutes: ✅ green.

If red, read the log, fix locally, push again. Do not proceed until CI is green.

---

## Task 15: Create the closed `platform-paid` overlay repo

**Files:**
- Create: GitHub repo `<your-account>/platform-paid` (private)
- Local clone: `C:\Projects\platform-paid`
- Create: `package.json`, `src/register.ts`, `config/plans/paid.yaml`, `README.md`

- [ ] **Step 1: Create the private repo on GitHub**

Go to https://github.com/new. Owner: your account. Name: `platform-paid`. Description: "or9.space — closed-source overlay (billing, ads, domain attach)." Visibility: **Private**. Initialize with: License = "None" (proprietary).

- [ ] **Step 2: Clone locally**

```powershell
cd C:\Projects
git clone https://github.com/<your-account>/platform-paid.git
cd platform-paid
```

- [ ] **Step 3: Create `package.json`**

Write:

```json
{
  "name": "platform-paid",
  "version": "0.0.1",
  "private": true,
  "license": "UNLICENSED",
  "type": "module",
  "main": "src/register.ts",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

Write:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 5: Create the registration stub**

Create `src/register.ts`:

```ts
/**
 * platform-paid registers real implementations into the platform's
 * ExtensionRegistry. The hosted or9.space deploy imports this file
 * exactly once at module-load time (next.config.js initializer).
 *
 * Phase 0: all impls are placeholders. Real implementations land in
 * Phase 7 (billing) and downstream phases.
 */

// At the moment we don't have a real ExtensionRegistry import working —
// the workspace link comes online in Task 17. For now this file is a
// readable contract document.

export function registerPaidExtensions(): void {
  // ext.register("adProvider", houseAdProvider);
  // ext.register("billingProvider", stripeBillingProvider);
  // ext.register("domainAttachProvider", cloudflareSslForSaasProvider);
}
```

- [ ] **Step 6: Create `config/plans/paid.yaml`**

Create `config/plans/paid.yaml`:

```yaml
features:
  ads: false
  fleet: true
  tournaments: true
  "discord.bot": true
```

- [ ] **Step 7: Write `README.md`**

```md
# platform-paid

**Private — proprietary, do not redistribute.**

Closed-source overlay on top of [or9space/platform](https://github.com/<your-account>/platform). Adds:

- Stripe billing
- House ad serving
- Cloudflare SSL-for-SaaS automated custom-domain attach
- Managed Discord bot connector

## Layout

```
platform-paid/
  src/register.ts          ← Single entry point; called once at app startup
  config/plans/paid.yaml   ← Paid-tier defaults overriding OSS free.yaml
```

## How the overlay works

The hosted or9.space deploy runs `pnpm install` in a workspace containing both repos. `next.config.js` imports `platform-paid/src/register.ts` exactly once at load time. That call replaces no-op providers in `platform`'s `ExtensionRegistry` with real implementations.

Self-host (OSS-only) deploys never import this file. No-op providers stay in place. Hosted features (ads, billing, etc.) silently do nothing.

## Phase 0

Stubs only. Real implementations land in Phase 7+ per the program-level spec.
```

- [ ] **Step 8: Commit + push**

```powershell
git add -A
git commit -m "feat: platform-paid overlay stub with register.ts + paid.yaml"
git push -u origin main
```

---

## Task 16: Wire the workspace link between platform and platform-paid (local dev only; CI sees OSS only)

**Files:**
- Modify: `C:\Projects\platform\pnpm-workspace.yaml`

- [ ] **Step 1: Document the local-only nature**

The OSS `pnpm-workspace.yaml` should NOT contain `platform-paid` — it would make OSS clones fail. Instead, the workspace link is established by a `pnpm-workspace.local.yaml` on the hosted-deploy host, which `pnpm install` reads in addition to the main one.

In `C:\Projects\platform\`, create `pnpm-workspace.local.yaml.example`:

```yaml
# Copy to pnpm-workspace.local.yaml on the hosted deploy host to
# enable the platform-paid overlay. OSS self-host should NOT have
# this file.
packages:
  - "../platform-paid"
```

Update `.gitignore` to ignore the live file:

```
pnpm-workspace.local.yaml
```

Verify by appending:

```powershell
"`npm-workspace.local.yaml" | Add-Content -Path .gitignore
```

(Actually verify the line lands cleanly — open `.gitignore` and ensure `pnpm-workspace.local.yaml` is on its own line.)

- [ ] **Step 2: Commit**

```powershell
cd C:\Projects\platform
git add -A
git commit -m "feat(workspace): document local-only platform-paid overlay link"
```

---

## Task 17: Provision the Hetzner CX22 VPS

This task is manual cloud setup. No code. Each step takes 5-10 minutes.

- [ ] **Step 1: Create the VPS**

In Hetzner Cloud Console:
- New Project: `or9space`.
- Add Server: Location closest to your audience (e.g., `Ashburn, VA` for US east). Image: `Ubuntu 24.04`. Type: `CX22` (€5.83/mo). Networking: IPv4 + IPv6. SSH key: paste your `~/.ssh/id_ed25519.pub` (generate locally if needed: `ssh-keygen -t ed25519`). Name: `or9space-prod`.

- [ ] **Step 2: SSH in and confirm**

Once VPS is provisioned (under a minute), copy the public IPv4. From your local PowerShell:

```powershell
ssh root@<vps-ip>
```

Expected: shell prompt on Ubuntu 24.04.

- [ ] **Step 3: Initial hardening**

On the VPS, run:

```sh
apt update && apt upgrade -y
adduser --gecos "" or9
usermod -aG sudo or9
mkdir -p /home/or9/.ssh
cp ~/.ssh/authorized_keys /home/or9/.ssh/
chown -R or9:or9 /home/or9/.ssh
chmod 700 /home/or9/.ssh
chmod 600 /home/or9/.ssh/authorized_keys
echo "PermitRootLogin no" >> /etc/ssh/sshd_config
echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
systemctl reload ssh
```

Exit the root SSH session. Reconnect as `or9`:

```powershell
ssh or9@<vps-ip>
```

Expected: shell prompt as `or9`.

- [ ] **Step 4: Install Docker**

On the VPS:

```sh
sudo apt install -y curl ca-certificates
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker or9
exit
```

Reconnect (group change requires fresh session):

```powershell
ssh or9@<vps-ip>
```

Verify Docker:

```sh
docker run --rm hello-world
```

Expected: "Hello from Docker!" message.

- [ ] **Step 5: Install `cloudflared`**

On the VPS:

```sh
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
cloudflared --version
```

Expected: version string (e.g., `cloudflared version 2025.x.x`).

---

## Task 18: Set up Cloudflare Tunnel between CF and the VPS

- [ ] **Step 1: Authenticate cloudflared with your CF account**

On the VPS:

```sh
cloudflared tunnel login
```

It prints a URL. Open it in your local browser (you may need to copy-paste). Authorize the `or9.space` zone. The browser shows "Success!". The cert is saved on the VPS at `~/.cloudflared/cert.pem`.

- [ ] **Step 2: Create the tunnel**

On the VPS:

```sh
cloudflared tunnel create or9space-prod
```

Expected: prints a tunnel UUID, saves credentials to `~/.cloudflared/<uuid>.json`. Copy the UUID.

- [ ] **Step 3: Configure the tunnel**

Create `~/.cloudflared/config.yml` on the VPS:

```sh
nano ~/.cloudflared/config.yml
```

Paste (replace `<uuid>` and `<email>`):

```yaml
tunnel: <uuid>
credentials-file: /home/or9/.cloudflared/<uuid>.json

ingress:
  - hostname: "*.or9.space"
    service: http://localhost:3000
  - hostname: or9.space
    service: http://localhost:3000
  - service: http_status:404
```

Save + exit.

- [ ] **Step 4: Add DNS records via cloudflared**

On the VPS:

```sh
cloudflared tunnel route dns or9space-prod or9.space
cloudflared tunnel route dns or9space-prod "*.or9.space"
```

Expected: both commands print "Added CNAME record". Verify in CF dashboard → DNS → Records: two new CNAMEs to `<uuid>.cfargotunnel.com`, proxied.

- [ ] **Step 5: Install cloudflared as a systemd service**

On the VPS:

```sh
sudo cloudflared service install
sudo systemctl status cloudflared
```

Expected: `active (running)`.

---

## Task 19: Deploy hello-world build to VPS

- [ ] **Step 1: Build + push the Docker image to GHCR**

On your local Windows host:

```powershell
cd C:\Projects\platform
docker build -t ghcr.io/<your-account>/platform:phase0 .
echo $env:GH_TOKEN | docker login ghcr.io -u <your-account> --password-stdin
docker push ghcr.io/<your-account>/platform:phase0
docker tag ghcr.io/<your-account>/platform:phase0 ghcr.io/<your-account>/platform:latest
docker push ghcr.io/<your-account>/platform:latest
```

(`$env:GH_TOKEN` is a GitHub personal access token with `write:packages` scope; create at https://github.com/settings/tokens.)

- [ ] **Step 2: Mark the GHCR image public OR provide a pull secret**

In GitHub → Packages → platform → Settings → Visibility → Public. (Or, if private, register a pull secret with Docker on the VPS via `docker login ghcr.io`.)

- [ ] **Step 3: Prepare the VPS deploy dir**

On the VPS:

```sh
sudo mkdir -p /opt/platform
sudo chown or9:or9 /opt/platform
cd /opt/platform
```

Create `docker-compose.yml`:

```sh
nano docker-compose.yml
```

Paste (replace `<your-account>`):

```yaml
services:
  next-app:
    image: ghcr.io/<your-account>/platform:latest
    restart: unless-stopped
    env_file: .env
    ports:
      - "127.0.0.1:3000:3000"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
```

Create `.env` (replace values):

```sh
nano .env
```

```
DATABASE_URL=postgresql://...:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...:5432/postgres
NEXTAUTH_SECRET=<long random>
NEXTAUTH_URL=https://or9.space
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=hello@or9.space
```

Permissions:

```sh
chmod 600 .env
```

- [ ] **Step 4: Start the stack**

On the VPS:

```sh
docker compose pull
docker compose up -d
docker compose ps
docker compose logs next-app --tail 30
```

Expected: `next-app` is `Up (healthy)`. Logs show Next started on port 3000.

- [ ] **Step 5: Smoke test via tunnel**

On your local Windows host:

```powershell
curl https://demo.or9.space/api/health
```

Expected: `{"ok":true,"ts":"..."}`.

Open `https://demo.or9.space` in a browser. Expected: "Demo Org" headline.

If you get a CF 522 or 1033 error, check `sudo systemctl status cloudflared` on the VPS and `docker compose logs next-app`. Most common cause: `.env` missing or VPS firewall blocking localhost loop.

---

## Task 20: Write the multi-agent dev workflow doc

**Files:**
- Create: `docs/AGENTS.md`

- [ ] **Step 1: Write `docs/AGENTS.md`**

Create `docs/AGENTS.md`:

```md
# Multi-agent dev workflow

This project's primary contributor is David Smereski, augmented by Claude (Opus 4.x + Sonnet 4.x). The workflow below treats the LLMs as a small team: opus plans + reviews, sonnet codes.

## Roles

- **Opus (planner)** — drafts implementation plans, decomposes specs into bite-sized tasks, picks the architecture for a sub-phase.
- **Sonnet (coder)** — executes plans task-by-task. Writes the code + tests called for in each step. Does not invent new design.
- **Opus (reviewer)** — reviews sonnet's PRs before merge. Reads the diff against the plan, flags drift, asks for fixes.

The human (David) is in the loop at:
1. Plan approval (before code lands).
2. Mid-implementation steering (when sonnet hits an unexpected blocker).
3. PR review (with opus reviewer's notes in hand).
4. Final merge + deploy.

## Per sub-phase loop

1. **Spec.** A program-level spec section identifies the sub-phase boundary (e.g., "Phase 1: platform skeleton"). Lives at `docs/superpowers/specs/*.md`.
2. **Plan.** Invoke `superpowers:brainstorming` and `superpowers:writing-plans` (opus). Output: a plan at `docs/superpowers/plans/<date>-<phase>.md`. David approves.
3. **Worktree.** `git worktree add ../platform-<phase> -b feat/<phase>` to isolate sub-phase work.
4. **Execute.** Sonnet runs `superpowers:executing-plans` (inline) or `superpowers:subagent-driven-development` (spawned). One task at a time. Commits after each task per the plan.
5. **Review.** When all tasks complete, opus reviewer runs `code-review` or a manual review pass. Findings flagged inline. Sonnet fixes them as new commits in the same branch.
6. **Smoke.** David smoke-tests against the staging deploy.
7. **Merge.** Squash-merge or merge-with-history depending on commit hygiene. Push to main. Auto-deploy to staging.
8. **Manual prod cut.** Once green on staging, David promotes to prod (Cloudflare DNS does not change; tag the image, update `docker-compose.yml`, `docker compose pull && docker compose up -d`).

## Branch hygiene

- Each sub-phase has one branch: `feat/<sub-phase-slug>`.
- Commits in that branch may include sonnet-authored work + opus-reviewer fix commits + human edits.
- Branch is merged or rebased onto main only after CI is green and opus reviewer signs off.
- No work on main directly except hot-fixes.

## Worktrees

Worktrees keep agents from stepping on each other when multiple sub-phases run in parallel:

```
C:\Projects\platform\          (main)
C:\Projects\platform-3a\       (Phase 3 sub-phase a: forums)
C:\Projects\platform-3b\       (Phase 3 sub-phase b: members + ranks)
C:\Projects\platform-4\        (Phase 4: marketing site)
```

Sonnet operating in `platform-3a` cannot accidentally edit `platform-3b` files. Each worktree has its own running dev server on its own port.

## Reviewer checklist (opus)

For each PR:

- [ ] Diff matches the plan task-by-task (no scope drift).
- [ ] Tests cover the changes (unit + integration where applicable).
- [ ] Multi-tenant code uses `db(ctx).*` — no direct prisma calls.
- [ ] Feature flag enforcement is in place for new routes.
- [ ] Permissions calls correct tier.
- [ ] No secrets committed.
- [ ] No `.no-verify` commits.
- [ ] No dead code or commented-out blocks.
- [ ] Imports clean, no unused.
- [ ] Commit messages follow `feat:`, `fix:`, `test:`, `docs:`, etc.

## When sonnet is blocked

- Sonnet should NOT invent new design. If a plan step is ambiguous, sonnet pauses and asks David.
- If sonnet discovers the plan is wrong (e.g., a referenced function doesn't exist), sonnet flags it, David re-invokes the planner if needed.

## When to bypass this workflow

- One-line bug fixes — David can hand-edit + commit directly.
- Documentation typos — same.
- Emergency hot-fixes — direct to main, retroactively brought into the next plan if pattern emerges.
```

- [ ] **Step 2: Commit**

```powershell
cd C:\Projects\platform
git add -A
git commit -m "docs(agents): multi-agent dev workflow (opus plan/review, sonnet code)"
git push origin main
```

---

## Task 21: Self-test the multi-agent loop on a throwaway feature

The goal: exercise the dev loop end-to-end with a tiny, throwaway feature so we discover friction before Phase 1.

**Throwaway feature: add a `/about` page.**

- [ ] **Step 1: Create the throwaway plan**

Write `docs/superpowers/plans/2026-06-11-throwaway-about-page.md`:

```md
# Throwaway: /about page

**Goal:** Add a static /about page to verify the multi-agent loop works.

## Task 1: Add /about

**Files:**
- Create: `app/about/page.tsx`

- [ ] Step 1: Create the page

```tsx
export default function AboutPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-xl space-y-4 text-center">
        <h1 className="text-4xl font-bold">About or9.space</h1>
        <p className="text-neutral-400">The org HQ for serious SC crews.</p>
      </div>
    </main>
  );
}
```

- [ ] Step 2: Commit

```sh
git add -A
git commit -m "feat: throwaway /about page"
```
```

- [ ] **Step 2: Make a worktree**

```powershell
cd C:\Projects\platform
git worktree add ../platform-throwaway -b feat/throwaway-about
cd ..\platform-throwaway
```

- [ ] **Step 3: Execute the throwaway task in this worktree**

Hand-execute the throwaway plan in the worktree. Create `app/about/page.tsx`, commit. The point is: validate that worktrees + branches work.

```powershell
mkdir app/about
# create page.tsx per the plan
git add -A
git commit -m "feat: throwaway /about page"
git push -u origin feat/throwaway-about
```

- [ ] **Step 4: Open a PR on GitHub**

In the GitHub UI for the platform repo, open a PR from `feat/throwaway-about` → `main`. Confirm:
- CI runs and passes.
- PR shows diff (the new page only).

- [ ] **Step 5: Merge + tear down the throwaway worktree**

After CI green, merge the PR (squash). Back in `C:\Projects\platform`:

```powershell
git pull origin main
git worktree remove ../platform-throwaway
git branch -d feat/throwaway-about
```

Confirm `/about` is live by visiting `https://demo.or9.space/about` (will need a re-deploy of the prod image — skip for the throwaway; the point was the dev loop, not the deploy).

- [ ] **Step 6: Delete the throwaway plan file**

```powershell
rm docs/superpowers/plans/2026-06-11-throwaway-about-page.md
git add -A
git commit -m "chore: remove throwaway plan after loop validation"
git push origin main
```

---

## Task 22: Exit checklist

Verify Phase 0 is truly done before invoking the Phase 1 brainstorm.

- [ ] **Check 1: OSS repo green on CI**

Visit `https://github.com/<your-account>/platform/actions`. Latest run on `main`: ✅.

- [ ] **Check 2: VPS deploy live**

```powershell
curl https://demo.or9.space/api/health
curl https://demo.or9.space
```

Both return 200. Tenant page shows "Demo Org".

- [ ] **Check 3: Both tenant subdomains resolve**

```powershell
curl -H "Host: freedomguards.or9.space" https://demo.or9.space
```

(Or visit `https://freedomguards.or9.space` directly.) Expected: "Freedom Guards" headline.

- [ ] **Check 4: Local OSS-only build works (self-host simulation)**

```powershell
cd C:\Projects\platform
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm build
pnpm start
```

Visit `http://demo.localhost:3000`. Expected: "Demo Org". No `platform-paid` errors.

- [ ] **Check 5: `platform-paid` cloneable + builds**

```powershell
cd C:\Projects
rmdir /s platform-paid
git clone https://github.com/<your-account>/platform-paid.git
cd platform-paid
pnpm install
pnpm typecheck 2>&1
```

Expected: no errors. (`pnpm test` will be `0 tests` for now — fine.)

- [ ] **Check 6: AGENTS.md exists and is sensible**

Open `docs/AGENTS.md`. Read it. Confirm it describes the loop accurately and you'd be willing to follow it.

- [ ] **Check 7: Cost actually under $7/mo**

Hetzner billing dashboard: confirm CX22 is the only running resource. Confirm no Cloudflare paid features are on. Confirm Supabase project is Free tier. Confirm Resend is Free tier.

If all 7 checks pass, Phase 0 is done. Invoke the Phase 1 brainstorm next.

---

## Self-Review (final pass before handoff)

### Spec coverage

Mapping spec sections → tasks:
- Spec §3 architecture (CF Tunnel + VPS + Next + Supabase) → Tasks 17–19.
- Spec §4 data model (Account, Tenant, Membership) → Task 4 (minimal subset; rest lands in Phase 1).
- Spec §5 config system (Zod schema + layered yaml) → Task 10.
- Spec §6 feature flags + content types → Tasks 7, 8.
- Spec §7 tenant lifecycle → Phase 1 (out of Phase 0 scope; just the Tenant + Membership table here).
- Spec §8 cost ceiling (Hetzner $5–6/mo) → Task 17.
- Spec §9 testing strategy → Tasks 3, 5–10 (vitest + TDD scaffolds). Tenant-leak fuzzer + RLS tester land in Phase 1.
- Spec §10 open-core split → Tasks 9 (ExtensionRegistry + provider interfaces), 15 (platform-paid repo), 16 (workspace overlay).
- Spec §11 v1 vs program scope → enforced via Task 7 flag registry.
- Spec §12 phases → this is the Phase 0 plan; subsequent phases get their own plans.

Gaps acknowledged + deferred to Phase 1:
- `tenant_config`, `tenant_feature_flag` tables (Phase 2 schema).
- ESLint custom rule `no-untenanted-query` (Phase 1 — needs RLS + integration tests to fully test it).
- Supabase RLS policies (Phase 1 — needs the tenant-scoped tables added).
- Multi-tenant integration tests (Phase 1, when tenant-scoped tables exist).
- `support_ticket`, `support_message` tables + portal (Phase 1).

These are all explicit in the spec as Phase 1 deliverables, not Phase 0. Phase 0 is the foundation, not the full app.

### Placeholder scan

No `TBD`, `TODO`, "fill in later", or "implement appropriate error handling" in this plan. Every step has concrete commands or code.

### Type consistency

Reviewed type names across tasks:
- `TenantContext` from Task 5 reused throughout.
- `FeatureFlagKey` from Task 7, referenced in Task 8.
- `ContentTypeName` from Task 8.
- `TenantConfig` from Task 10.
- `RankTier` from Task 6.

All consistent. No drift.

---

## Plan complete + execution choice

Plan complete and saved to `docs/superpowers/plans/2026-06-11-phase-0-platform-bootstrap.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
