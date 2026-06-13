# Phase 3c — Treasury Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. Two-stage review on Task 3 (treasury write actions — money/ledger).

**Goal:** A tenant-scoped org treasury: an append-style ledger of INCOME/EXPENSE entries (amount, category, description, author), a running balance + per-category/per-type summary, OFFICER+ entry creation, COMMAND deletion (audit-logged), all flag-gated (`treasury`), tenant-isolated (RLS), and shown in the tenant's currency label.

**Architecture:** One new tenant-scoped table `treasury_entries` with `tenant_id` + RLS. Two enums (`TreasuryType`, `TreasuryCategory`) ported from FreedomGuard. Authorship references `Membership.id`. Balance = Σ(INCOME) − Σ(EXPENSE), computed in queries. Reads/writes via `db(ctx)`. Deletion is COMMAND-only and writes an `AuditLog` row. The treasury area is OFFICER+ (financial data is leadership-sensitive) — gated in the layout.

**Tech Stack:** Next 16, Prisma 6, RLS (app_user prod), Vitest 4. Reuses Phase 1 `db(ctx)`, Phase 2 `getViewerMembership`/`hasTier`/`getFullTenantContext`/`isFeatureEnabled`/`<L>`, Phase 3b `writeAudit`, Phase 3a UI patterns.

**Branch:** `feat/phase-3c-treasury`.

**Scope cut:** operation/event linkage (FG's `operationId` — no Operation model yet, defer to the ops phase); recurring/scheduled entries; multi-currency (single tenant currency via `labels.currencyCode`); entry EDIT (create + delete only — edits would muddy the ledger; defer). Custom categories deferred (fixed enum now).

**Environment (every task):** `C:\Projects\platform`, Bash tool. Dev DB `or9-pg` :5434. Baseline tests green at start (confirm count in Task 0). Gates: `pnpm test`, `pnpm lint`, `pnpm lint:rule-test`, `pnpm exec tsc --noEmit`; UI tasks also `pnpm build`. Conventional commits, David Smereski, do NOT push (controller batches PR). RLS: `treasury_entries` + `audit_logs` tenant-scoped → ALWAYS `db(ctx)`, never `prismaGlobal`. ESLint `or9/no-untenanted-query` must stay green. `gh` at `C:\Program Files\GitHub CLI\gh.exe`.

---

## File Structure (additions)

```
prisma/
  schema.prisma                         ← +TreasuryType, +TreasuryCategory enums, +TreasuryEntry, +Membership.treasuryEntries
  migrations/<ts>_phase3c_treasury/
  rls/policies.sql                      ← +treasury_entries (ENABLE+FORCE+policy)
lib/
  treasury.ts                           ← TREASURY_CATEGORIES const + label map (shared by queries/UI)
  queries/treasury.ts                   ← listTreasuryEntries, getTreasuryBalance, getTreasurySummary
  actions/treasury-core.ts              ← createTreasuryEntryCore (OFFICER+), deleteTreasuryEntryCore (COMMAND+audit)
  actions/treasury.ts                   ← "use server" wrappers
app/treasury/
  layout.tsx                            ← flag gate (treasury) + OFFICER+ gate
  page.tsx                              ← balance header + summary + ledger + filters
  add-entry-form.tsx                    ← OFFICER+ create island
  entry-actions.tsx                     ← COMMAND delete island
scripts/tenant-leak-fuzzer.ts           ← +treasury_entry probe
tests/
  integration/treasury.test.ts          ← queries + actions (balance, tier gates, delete+audit, isolation)
```

---

## Task 0: Branch

- [ ] `cd C:\Projects\platform; git checkout main; git pull origin main; git checkout -b feat/phase-3c-treasury`. Run `pnpm test`, record the baseline count (expected 146) — all green.

---

## Task 1: Schema + enums + RLS + migration

**Files:** `prisma/schema.prisma`, migration, `prisma/rls/policies.sql`

- [ ] **Step 1: Append enums + model to `prisma/schema.prisma`:**

```prisma
enum TreasuryType {
  INCOME
  EXPENSE
}

enum TreasuryCategory {
  MINING
  TRADING
  BOUNTY
  SALVAGE
  DONATION
  PURCHASE
  PAYOUT
  EVENT
  OTHER
}

model TreasuryEntry {
  id                 String           @id @default(cuid())
  tenantId           String           @map("tenant_id")
  authorMembershipId String           @map("author_membership_id")
  type               TreasuryType
  category           TreasuryCategory
  amount             Int
  description        String           @db.VarChar(500)
  createdAt          DateTime         @default(now()) @map("created_at")

  author Membership @relation("treasuryAuthor", fields: [authorMembershipId], references: [id], onDelete: Cascade)

  @@index([tenantId, createdAt])
  @@index([tenantId, type])
  @@map("treasury_entries")
}
```

Add to `Membership` relations:
```prisma
  treasuryEntries TreasuryEntry[] @relation("treasuryAuthor")
```

- [ ] **Step 2:** `pnpm exec prisma migrate dev --name phase3c_treasury`. Expect applied + "in sync". If drift/shadow error, STOP + report (do NOT reset).

- [ ] **Step 3: Append RLS policy to `prisma/rls/policies.sql`** (same FORCE template as the forum tables — read the file to match style):

```sql
ALTER TABLE treasury_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_entries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON treasury_entries;
CREATE POLICY tenant_isolation ON treasury_entries
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
```

- [ ] **Step 4: Apply RLS to dev:** `APP_USER_PASSWORD="rls-test-password-1" pnpm db:setup-rls` — expect "RLS roles + policies applied".

- [ ] **Step 5:** `pnpm test` (baseline still green), `pnpm exec tsc --noEmit` clean. Confirm `treasury_entries`/`treasuryEntry` is NOT in `GLOBAL_TABLES` (it's tenant-scoped).

- [ ] **Step 6: Commit** `feat(treasury): schema + enums + RLS for tenant-scoped treasury entries`

---

## Task 2: Treasury constants + queries (TDD)

**Files:** `lib/treasury.ts`, `lib/queries/treasury.ts`, `tests/integration/treasury.test.ts` (query portion)

- [ ] **Step 1: Create `lib/treasury.ts`:**

```ts
export const TREASURY_CATEGORIES = [
  "MINING", "TRADING", "BOUNTY", "SALVAGE", "DONATION", "PURCHASE", "PAYOUT", "EVENT", "OTHER",
] as const;
export type TreasuryCategory = (typeof TREASURY_CATEGORIES)[number];
export const TREASURY_TYPES = ["INCOME", "EXPENSE"] as const;
export type TreasuryType = (typeof TREASURY_TYPES)[number];

export const CATEGORY_LABELS: Record<TreasuryCategory, string> = {
  MINING: "Mining", TRADING: "Trading", BOUNTY: "Bounty", SALVAGE: "Salvage",
  DONATION: "Donation", PURCHASE: "Purchase", PAYOUT: "Payout", EVENT: "Event", OTHER: "Other",
};
```

- [ ] **Step 2: Failing query tests — create `tests/integration/treasury.test.ts`:**

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listTreasuryEntries, getTreasuryBalance, getTreasurySummary } from "@/lib/queries/treasury";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = makeTenantContext(TENANT_A.id);

async function mkMember(tenantId: string, username: string) {
  const acc = await testPrisma.account.create({ data: { email: `${username}-${Math.random().toString(36).slice(2,6)}@it.example` } });
  return testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username, tier: "OFFICER" } });
}
async function entry(tenantId: string, authorId: string, type: string, category: string, amount: number, description = "x") {
  return testPrisma.treasuryEntry.create({ data: { tenantId, authorMembershipId: authorId, type: type as never, category: category as never, amount, description } });
}

describe("treasury queries", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.treasuryEntry.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("getTreasuryBalance = sum(income) - sum(expense), tenant-scoped", async () => {
    const mA = await mkMember(TENANT_A.id, "ta");
    await entry(TENANT_A.id, mA.id, "INCOME", "DONATION", 1000);
    await entry(TENANT_A.id, mA.id, "INCOME", "MINING", 500);
    await entry(TENANT_A.id, mA.id, "EXPENSE", "PURCHASE", 300);
    const mB = await mkMember(TENANT_B.id, "tb");
    await entry(TENANT_B.id, mB.id, "INCOME", "DONATION", 9999);  // noise
    expect(await getTreasuryBalance(ctxA)).toBe(1200);
  });

  it("listTreasuryEntries returns this tenant's entries newest-first with author name", async () => {
    const mA = await mkMember(TENANT_A.id, "ta");
    await entry(TENANT_A.id, mA.id, "INCOME", "DONATION", 100, "first");
    await entry(TENANT_A.id, mA.id, "EXPENSE", "PAYOUT", 50, "second");
    const rows = await listTreasuryEntries(ctxA);
    expect(rows).toHaveLength(2);
    expect(rows[0].description).toBe("second");  // newest first
    expect(rows[0].authorName).toBe("ta");
  });

  it("listTreasuryEntries filters by type", async () => {
    const mA = await mkMember(TENANT_A.id, "ta");
    await entry(TENANT_A.id, mA.id, "INCOME", "DONATION", 100);
    await entry(TENANT_A.id, mA.id, "EXPENSE", "PAYOUT", 50);
    const inc = await listTreasuryEntries(ctxA, { type: "INCOME" });
    expect(inc).toHaveLength(1);
    expect(inc[0].type).toBe("INCOME");
  });

  it("getTreasurySummary totals income/expense and per-category", async () => {
    const mA = await mkMember(TENANT_A.id, "ta");
    await entry(TENANT_A.id, mA.id, "INCOME", "MINING", 700);
    await entry(TENANT_A.id, mA.id, "INCOME", "MINING", 300);
    await entry(TENANT_A.id, mA.id, "EXPENSE", "PURCHASE", 200);
    const s = await getTreasurySummary(ctxA);
    expect(s.totalIncome).toBe(1000);
    expect(s.totalExpense).toBe(200);
    expect(s.byCategory.MINING).toBe(1000);
  });

  it("balance is 0 with no entries", async () => {
    expect(await getTreasuryBalance(ctxA)).toBe(0);
  });
});
```

- [ ] **Step 3:** red. Report.

- [ ] **Step 4: Create `lib/queries/treasury.ts`:**

```ts
import { db } from "../db";
import type { TenantContext } from "../tenant";
import type { TreasuryType, TreasuryCategory } from "../treasury";

export interface TreasuryRow {
  id: string; type: TreasuryType; category: TreasuryCategory; amount: number;
  description: string; createdAt: Date; authorName: string;
}

export async function listTreasuryEntries(
  ctx: TenantContext, filter?: { type?: TreasuryType; category?: TreasuryCategory },
): Promise<TreasuryRow[]> {
  const rows = await db(ctx).treasuryEntry.findMany({
    where: { type: filter?.type, category: filter?.category },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, type: true, category: true, amount: true, description: true, createdAt: true,
      author: { select: { displayName: true, username: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id, type: r.type as TreasuryType, category: r.category as TreasuryCategory,
    amount: r.amount, description: r.description, createdAt: r.createdAt,
    authorName: r.author?.displayName ?? r.author?.username ?? "Unknown",
  }));
}

export async function getTreasuryBalance(ctx: TenantContext): Promise<number> {
  const grouped = await db(ctx).treasuryEntry.groupBy({ by: ["type"], _sum: { amount: true } });
  let bal = 0;
  for (const g of grouped) {
    const sum = g._sum.amount ?? 0;
    bal += g.type === "INCOME" ? sum : -sum;
  }
  return bal;
}

export interface TreasurySummary {
  totalIncome: number; totalExpense: number; balance: number;
  byCategory: Record<string, number>;
}

export async function getTreasurySummary(ctx: TenantContext): Promise<TreasurySummary> {
  const rows = await db(ctx).treasuryEntry.findMany({ select: { type: true, category: true, amount: true } });
  let totalIncome = 0, totalExpense = 0;
  const byCategory: Record<string, number> = {};
  for (const r of rows) {
    if (r.type === "INCOME") totalIncome += r.amount; else totalExpense += r.amount;
    byCategory[r.category] = (byCategory[r.category] ?? 0) + r.amount;
  }
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense, byCategory };
}
```

NOTE: if `db(ctx)` doesn't proxy `groupBy` (check `lib/db.ts` READ_OPS — if `groupBy` isn't covered, the proxy may not inject tenant_id into it!). If groupBy is NOT in the proxy's handled ops, do NOT use it (it would read cross-tenant under non-RLS). Instead compute the balance from a `findMany({ select: { type, amount } })` reduce (same as getTreasurySummary). VERIFY this in Task 2 — read `lib/db.ts` and confirm `groupBy` is injected; if not, rewrite `getTreasuryBalance` to use findMany+reduce. Report which path you took.

- [ ] **Step 5:** green. lint + tsc clean. `or9/no-untenanted-query` green.
- [ ] **Step 6: Commit** `feat(treasury): constants + tenant-scoped queries (list/balance/summary)`

---

## Task 3: Treasury write actions (TDD) — SECURITY-SENSITIVE (money)

**Files:** `lib/actions/treasury-core.ts`, extend `tests/integration/treasury.test.ts`

Cores: `createTreasuryEntryCore` (OFFICER+, validates amount + type + category + description), `deleteTreasuryEntryCore` (COMMAND only, audit-logged). Actor tier passed in (resolved server-side by wrapper). Amount must be a positive integer within a sane cap.

- [ ] **Step 1: Failing tests — append a describe block:**

```ts
import { createTreasuryEntryCore, deleteTreasuryEntryCore } from "@/lib/actions/treasury-core";

describe("treasury write actions", () => {
  beforeEach(async () => { await resetDb(); await testPrisma.treasuryEntry.deleteMany({}); await seedTwoTenants(); });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("OFFICER creates an entry", async () => {
    const m = await mkMember(TENANT_A.id, "off");  // mkMember seeds OFFICER
    const r = await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "INCOME", category: "DONATION", amount: 500, description: "gift" });
    expect(r.ok).toBe(true);
    const rows = await testPrisma.treasuryEntry.findMany({ where: { tenantId: TENANT_A.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(500);
  });

  it("ENLISTED/NCO cannot create an entry", async () => {
    const m = await mkMember(TENANT_A.id, "grunt");
    const r = await createTreasuryEntryCore(TENANT_A.id, m.id, "NCO", { type: "INCOME", category: "DONATION", amount: 500, description: "x" });
    expect(r.ok).toBe(false);
  });

  it("rejects non-positive or non-integer amounts", async () => {
    const m = await mkMember(TENANT_A.id, "off");
    expect((await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "INCOME", category: "MINING", amount: 0, description: "x" })).ok).toBe(false);
    expect((await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "INCOME", category: "MINING", amount: -5, description: "x" })).ok).toBe(false);
    expect((await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "INCOME", category: "MINING", amount: 1.5, description: "x" })).ok).toBe(false);
  });

  it("rejects an invalid category/type", async () => {
    const m = await mkMember(TENANT_A.id, "off");
    expect((await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "GIFT" as never, category: "MINING", amount: 5, description: "x" })).ok).toBe(false);
    expect((await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "INCOME", category: "ROBBERY" as never, amount: 5, description: "x" })).ok).toBe(false);
  });

  it("COMMAND deletes an entry and writes an audit row", async () => {
    const m = await mkMember(TENANT_A.id, "off");
    const created = await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "EXPENSE", category: "PAYOUT", amount: 100, description: "d" });
    if (!created.ok) throw new Error();
    const cmdAcc = await testPrisma.account.create({ data: { email: `cmd-${Math.random().toString(36).slice(2,6)}@it.example` } });
    const r = await deleteTreasuryEntryCore(TENANT_A.id, cmdAcc.id, "COMMAND", created.entryId);
    expect(r.ok).toBe(true);
    expect(await testPrisma.treasuryEntry.count({ where: { tenantId: TENANT_A.id } })).toBe(0);
    const audit = await testPrisma.auditLog.findFirst({ where: { tenantId: TENANT_A.id, action: "treasury.entry.delete" } });
    expect(audit).not.toBeNull();
  });

  it("OFFICER cannot delete (COMMAND only)", async () => {
    const m = await mkMember(TENANT_A.id, "off");
    const created = await createTreasuryEntryCore(TENANT_A.id, m.id, "OFFICER", { type: "INCOME", category: "MINING", amount: 10, description: "d" });
    if (!created.ok) throw new Error();
    const r = await deleteTreasuryEntryCore(TENANT_A.id, m.accountId, "OFFICER", created.entryId);
    expect(r.ok).toBe(false);
    expect(await testPrisma.treasuryEntry.count({ where: { tenantId: TENANT_A.id } })).toBe(1);
  });

  it("cannot delete an entry in another tenant", async () => {
    const mB = await mkMember(TENANT_B.id, "tb");
    const e = await entry(TENANT_B.id, mB.id, "INCOME", "DONATION", 50);
    const cmdAcc = await testPrisma.account.create({ data: { email: `cmd2-${Math.random().toString(36).slice(2,6)}@it.example` } });
    const r = await deleteTreasuryEntryCore(TENANT_A.id, cmdAcc.id, "COMMAND", e.id);
    expect(r.ok).toBe(false);  // db(ctx) scopes to tenant A — B's entry invisible
    expect(await testPrisma.treasuryEntry.count({ where: { tenantId: TENANT_B.id } })).toBe(1);
  });
});
```

- [ ] **Step 2:** red. Report.

- [ ] **Step 3: Create `lib/actions/treasury-core.ts`:**

```ts
import { z } from "zod";
import { db } from "../db";
import { makeTenantContext } from "../tenant";
import { hasTier, type RankTier } from "../permissions";
import { writeAudit } from "../audit";
import { TREASURY_TYPES, TREASURY_CATEGORIES } from "../treasury";

type Result<T extends Record<string, unknown> = Record<string, never>> =
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
  await db(ctx).treasuryEntry.delete({ where: { id: entryId } });
  await writeAudit(ctx, actorAccountId, "treasury.entry.delete", {
    entryId, type: e.type, amount: e.amount, category: e.category,
  });
  return { ok: true };
}
```

NOTE: `treasuryEntry.create` — pass `tenantId` explicitly (the proxy injects it at top level too; explicit value = same, required by the Prisma type as in forums-core/members). Confirm tsc.

- [ ] **Step 4:** green. lint + tsc clean.
- [ ] **Step 5: Commit** `feat(treasury): write actions (OFFICER create, COMMAND delete + audit) with amount validation`

---

## Task 4: Session-bound action wrappers

**Files:** `lib/actions/treasury.ts`

- [ ] **Step 1: Create `lib/actions/treasury.ts`** (mirror `lib/actions/members.ts` ctx() pattern):

```ts
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import { createTreasuryEntryCore, deleteTreasuryEntryCore } from "./treasury-core";
import type { TreasuryType, TreasuryCategory } from "../treasury";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, accountId, membershipId: m.id, tier: m.tier };
}

export async function createTreasuryEntryAction(input: { type: TreasuryType; category: TreasuryCategory; amount: number; description: string }) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await createTreasuryEntryCore(c.tenantId, c.membershipId, c.tier, input);
  if (r.ok) revalidatePath("/treasury");
  return r;
}

export async function deleteTreasuryEntryAction(entryId: string) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  const r = await deleteTreasuryEntryCore(c.tenantId, c.accountId, c.tier, entryId);
  if (r.ok) revalidatePath("/treasury");
  return r;
}
```

- [ ] **Step 2:** gates (tests still green; wrappers exercised via UI + cores). lint + tsc + build clean. Commit `feat(treasury): session-bound action wrappers`

---

## Task 5: Treasury UI

**Files:** `app/treasury/layout.tsx`, `app/treasury/page.tsx`, `app/treasury/add-entry-form.tsx`, `app/treasury/entry-actions.tsx`

Reuse Phase 3a/3b page patterns. Currency label via `<L k="currencyCode" fallback="aUEC" />`.

- [ ] **`app/treasury/layout.tsx`** — gate: `getFullTenantContext()`; if no tenant or `!isFeatureEnabled(ctx.features, "treasury")` → `notFound()`. THEN resolve viewer membership (getSessionAccountId + getViewerMembership); if no membership or `!hasTier(tier, "OFFICER")` → `notFound()` (treasury is OFFICER+; financial data). Render a small header + children. (Mirror `app/forums/layout.tsx` + add the tier check.)
- [ ] **`app/treasury/page.tsx`** — server component. Resolve ctx + viewer tier. `getTreasurySummary(ctx)` for the balance header (balance in `<L k="currencyCode"/>`, total income/expense, per-category breakdown). `listTreasuryEntries(ctx, filter)` for the ledger (read `?type=`/`?category=` searchParams, awaited). Ledger rows: date, type badge (income green / expense red), category label (from CATEGORY_LABELS), amount, description, author. Render `<AddEntryForm/>` (all viewers here are OFFICER+, so always show). Per-row `<EntryActions entryId/>` only if `hasTier(tier,"COMMAND")`.
- [ ] **`app/treasury/add-entry-form.tsx`** — `"use client"`. type select (INCOME/EXPENSE), category select (TREASURY_CATEGORIES), amount number input (positive int), description text → `createTreasuryEntryAction`. useTransition, disable while pending, error display, clear + `router.refresh()` on success.
- [ ] **`app/treasury/entry-actions.tsx`** — `"use client"`. Delete button → `deleteTreasuryEntryAction(entryId)` (confirm() before). useTransition, error display, `router.refresh()` on success.
- [ ] **Gate:** `pnpm build` (route `/treasury` dynamic), `pnpm test` green, lint + tsc clean.
- [ ] **Commit** `feat(treasury): UI — balance, summary, ledger, add/delete`

---

## Task 6: Leak fuzzer + flag confirm

**Files:** `scripts/tenant-leak-fuzzer.ts`

- [ ] **Step 1:** Add a `treasury_entry` probe to the fuzzer (both passes), mirroring the forum probes: seed a tenant-B treasury entry with a marker description; assert tenant-A reads (injection layer + RLS layer) never expose it. Run `APP_USER_PASSWORD="rls-test-password-1" pnpm fuzz:leak` — both passes clean.
- [ ] **Step 2: Commit** `feat(treasury): leak-fuzzer treasury probe`

---

## Task 7: Gate + PR + CI + review

- [ ] Full gate (test/lint/rule-test/tsc/build/fuzz). Push `feat/phase-3c-treasury`, open PR (gh full path, `--body-file`). Watch CI green. STOP for controller holistic review (focus: create OFFICER+, delete COMMAND+audit, amount positive-int-capped, type/category enum-validated, all via db(ctx), cross-tenant delete impossible, balance math correct, treasury_entry leak-probe clean, OFFICER+ view gate in layout).

---

## Task 8: Deploy (controller, after merge)

- [ ] Deploy per platform mechanism (`or9@87.99.144.147`): pull src, rebuild `platform-builder:latest` + `platform:latest`, `prisma migrate deploy` (ADDS 1 table + 2 enums — additive, safe), **re-run `db:setup-rls`** (new treasury_entries policy must apply under app_user), `docker compose up -d`. Authed prod walk: as OFFICER open `/treasury`, add an income + expense entry, confirm balance; as COMMAND delete one (confirm audit); confirm a non-OFFICER member gets 404 on `/treasury`; confirm forums-off/treasury-off behavior + cross-tenant isolation.

---

## Self-Review

**Spec coverage:** treasury ledger (INCOME/EXPENSE + category) ✓; balance + summary ✓; OFFICER create / COMMAND delete + audit ✓; amount validation ✓; flag gate (`treasury`) + OFFICER+ view gate ✓; tenant currency label ✓; RLS + fuzzer ✓.

**Security:** create OFFICER+, delete COMMAND+audit (actor tier from wrapper/session); amount positive-int ≤ 1e9; type/category enum-validated (no injection); all db(ctx) (RLS + lint rule); nested none (single-table); cross-tenant delete impossible (db(ctx) scopes lookup → invisible). groupBy proxy-coverage verified in Task 2 (fallback to findMany+reduce if not injected).

**Deferrals (logged):** operation/event link; entry edit; recurring entries; multi-currency; custom categories.

**Type consistency:** `TreasuryType`/`TreasuryCategory` from `lib/treasury.ts` throughout; `TreasuryRow`/`TreasurySummary` exported; cores `(tenantId, …actor…, input/entryId)`; wrappers resolve session→membership→tier; `writeAudit` for deletes.

---

## Execution

Subagent-driven (sonnet codes, opus reviews). Two-stage review on Task 3. Controller deploy (Task 8) after merge + holistic review.
