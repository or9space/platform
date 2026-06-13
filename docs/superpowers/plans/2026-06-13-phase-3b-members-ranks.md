# Phase 3b — Members & Ranks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. Two-stage review on Task 4 (rank management — privilege changes).

**Goal:** A tenant-scoped members directory + member profiles, member self-profile editing, COMMAND-gated rank (tier) management with last-COMMAND lockout protection + audit logging, and tenant-configurable rank labels.

**Architecture:** Members are the existing per-tenant `Membership` rows. Add `bio`/`avatarUrl` profile fields. New queries/actions go through `db(ctx)` (tenant-isolated, RLS-enforced). Rank changes are COMMAND-only, write an `AuditLog` row, and refuse to demote/leave the org with zero COMMAND members. Rank labels are four flat config keys consumed by a `<Rank>` helper (mirrors `<L>`).

**Tech Stack:** Next 16, Prisma 6, RLS (app_user prod), Vitest 4. Reuses Phase 1 `db(ctx)`/`setTenantContext`, Phase 2 `getViewerMembership`/`requireTier`/`hasTier`/`getFullTenantContext`/`<L>`/config write actions, Phase 3a UI patterns (server page + `useTransition` client islands).

**Branch:** `feat/phase-3b-members-ranks`.

**Scope cut:** reputation/karma, squadrons, member badges/awards, member-to-member messaging — all deferred. 3b ships: directory, profile, self-edit, rank management, rank labels, audit logging.

**Environment (every task):** `C:\Projects\platform`, Bash tool. Dev DB `or9-pg` :5434. 127 tests green at start. Gates: `pnpm test`, `pnpm lint`, `pnpm lint:rule-test`, `pnpm exec tsc --noEmit`; UI tasks also `pnpm build`. Conventional commits, David Smereski, do NOT push (controller batches PR). RLS: `memberships` + `audit_logs` are tenant-scoped → ALWAYS `db(ctx)`, never `prismaGlobal`. ESLint `or9/no-untenanted-query` must stay green.

---

## File Structure (additions / changes)

```
prisma/
  schema.prisma                         ← +Membership.bio, +Membership.avatarUrl
  migrations/<ts>_phase3b_member_profile/
lib/
  config/schema.ts                      ← +4 rank label keys in LabelsSchema
  actions/tenant-config-core.ts         ← mirror the 4 rank keys in the strict LabelsSchema
  audit.ts                              ← NEW: writeAudit(ctx, actorAccountId, action, detail)
  queries/members.ts                    ← NEW: listMembers, getMemberByUsername, countCommandMemberships
  actions/members-core.ts               ← NEW: updateOwnProfileCore, setMemberTierCore (SECURITY-CRITICAL)
  actions/members.ts                    ← NEW: "use server" wrappers
components/
  rank.tsx                              ← NEW: <Rank tier> resolves tenant rank label
app/
  members/layout.tsx                    ← auth gate (signed-in org member only)
  members/page.tsx                      ← directory
  members/[username]/page.tsx           ← profile
  members/[username]/profile-edit.tsx   ← self-edit island (own profile only)
  (tenant-admin)/admin/members/page.tsx ← COMMAND rank-management console
  (tenant-admin)/admin/members/rank-controls.tsx
tests/
  integration/members.test.ts          ← queries + actions (incl. rank-change + lockout)
  unit/rank-labels.test.ts             ← config rank-label resolution
```

---

## Task 0: Branch

- [ ] `cd C:\Projects\platform; git checkout main; git pull origin main; git checkout -b feat/phase-3b-members-ranks`. Confirm `pnpm test` = 127 green.

---

## Task 1: Member profile fields + rank labels (schema + config)

**Files:** `prisma/schema.prisma`, migration, `lib/config/schema.ts`, `lib/actions/tenant-config-core.ts`, `tests/unit/rank-labels.test.ts`

- [ ] **Step 1: Add two fields to `Membership` in `prisma/schema.prisma`** (after `displayName`):

```prisma
  bio         String?   @db.VarChar(500)
  avatarUrl   String?   @map("avatar_url") @db.VarChar(500)
```

- [ ] **Step 2:** `pnpm exec prisma migrate dev --name phase3b_member_profile`. Expect applied + "in sync". (Additive nullable columns — no RLS change; `memberships` already has its policy.)

- [ ] **Step 3: Add 4 rank label keys to `LabelsSchema` in `lib/config/schema.ts`** (inside the existing object):

```ts
  rankEnlisted: z.string().max(40).default("Enlisted"),
  rankNco:      z.string().max(40).default("NCO"),
  rankOfficer:  z.string().max(40).default("Officer"),
  rankCommand:  z.string().max(40).default("Command"),
```

- [ ] **Step 4: Mirror the 4 keys in the strict `LabelsSchema` in `lib/actions/tenant-config-core.ts`** so COMMAND can edit them via the existing config editor (keep `.strict()`):

```ts
  rankEnlisted: z.string().max(40).optional(),
  rankNco: z.string().max(40).optional(),
  rankOfficer: z.string().max(40).optional(),
  rankCommand: z.string().max(40).optional(),
```

- [ ] **Step 5: Failing unit test `tests/unit/rank-labels.test.ts`:**

```ts
import { describe, it, expect } from "vitest";
import { ConfigSchema } from "@/lib/config/schema";
import { rankLabelKey } from "@/components/rank";

describe("rank labels", () => {
  it("config defaults provide the four rank labels", () => {
    const c = ConfigSchema.parse({
      branding: { name: "X" }, labels: {}, features: {
        forums: true, handbook: false, loot: false, inventory: false, treasury: false,
        fleet: false, tournaments: false, "calendar.googleIntegration": false, "discord.bot": false, ads: false,
      },
    });
    expect(c.labels.rankEnlisted).toBe("Enlisted");
    expect(c.labels.rankCommand).toBe("Command");
  });

  it("rankLabelKey maps each tier to its label key", () => {
    expect(rankLabelKey("ENLISTED")).toBe("rankEnlisted");
    expect(rankLabelKey("NCO")).toBe("rankNco");
    expect(rankLabelKey("OFFICER")).toBe("rankOfficer");
    expect(rankLabelKey("COMMAND")).toBe("rankCommand");
  });
});
```

- [ ] **Step 6:** red (rankLabelKey + component missing). Report.

- [ ] **Step 7: Create `components/rank.tsx`:**

```tsx
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import type { RankTier } from "@/lib/permissions";
import type { TenantConfig } from "@/lib/config/schema";

type RankLabelKey = "rankEnlisted" | "rankNco" | "rankOfficer" | "rankCommand";

export function rankLabelKey(tier: RankTier): RankLabelKey {
  switch (tier) {
    case "ENLISTED": return "rankEnlisted";
    case "NCO": return "rankNco";
    case "OFFICER": return "rankOfficer";
    case "COMMAND": return "rankCommand";
  }
}

const FALLBACK: Record<RankTier, string> = {
  ENLISTED: "Enlisted", NCO: "NCO", OFFICER: "Officer", COMMAND: "Command",
};

/** Server component: renders the tenant's label for a rank tier. */
export async function Rank({ tier }: { tier: RankTier }) {
  const ctx = await getFullTenantContext();
  const key = rankLabelKey(tier) as keyof TenantConfig["labels"];
  return <>{ctx?.config.labels[key] ?? FALLBACK[tier]}</>;
}
```

- [ ] **Step 8:** green. `pnpm test` (129), lint + tsc clean.
- [ ] **Step 9: Commit** `feat(members): profile fields (bio/avatar) + tenant rank labels`

---

## Task 2: Audit write helper + member queries (TDD)

**Files:** `lib/audit.ts`, `lib/queries/members.ts`, `tests/integration/members.test.ts` (query portion)

- [ ] **Step 1: Create `lib/audit.ts`:**

```ts
import { db } from "./db";
import type { TenantContext } from "./tenant";

/** Append an audit row for this tenant. audit_logs is tenant-scoped (RLS). */
export async function writeAudit(
  ctx: TenantContext, actorAccountId: string, action: string, detail: Record<string, unknown> = {},
): Promise<void> {
  await db(ctx).auditLog.create({
    data: { actorAccountId, action, detail: detail as never },
  });
}
```

- [ ] **Step 2: Failing query tests — create `tests/integration/members.test.ts`:**

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { makeTenantContext } from "@/lib/tenant";
import { listMembers, getMemberByUsername, countCommandMemberships } from "@/lib/queries/members";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = makeTenantContext(TENANT_A.id);

async function mk(tenantId: string, username: string, tier: string, displayName?: string) {
  const acc = await testPrisma.account.create({ data: { email: `${username}-${Math.random().toString(36).slice(2,6)}@it.example` } });
  return testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username, displayName, tier: tier as never } });
}

describe("member queries", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("listMembers returns only this tenant's members, ordered by tier desc then username", async () => {
    await mk(TENANT_A.id, "alpha", "ENLISTED", "Alpha");
    await mk(TENANT_A.id, "boss", "COMMAND", "Boss");
    await mk(TENANT_B.id, "bravo", "OFFICER", "BRAVO LEAK");
    const rows = await listMembers(ctxA);
    expect(rows.map((m) => m.username)).toEqual(["boss", "alpha"]);  // COMMAND first
    expect(rows.some((m) => m.username === "bravo")).toBe(false);
  });

  it("listMembers search filters by username/displayName (tenant-scoped)", async () => {
    await mk(TENANT_A.id, "needle", "ENLISTED", "Findme");
    await mk(TENANT_A.id, "haystack", "ENLISTED", "Other");
    const rows = await listMembers(ctxA, "find");
    expect(rows.map((m) => m.username)).toEqual(["needle"]);
  });

  it("getMemberByUsername returns the member + counts, tenant-scoped", async () => {
    const m = await mk(TENANT_A.id, "profileguy", "OFFICER", "Profile Guy");
    const got = await getMemberByUsername(ctxA, "profileguy");
    expect(got?.id).toBe(m.id);
    expect(got?.tier).toBe("OFFICER");
    expect(got?.threadCount).toBe(0);
    expect(got?.postCount).toBe(0);
  });

  it("getMemberByUsername returns null for another tenant's member", async () => {
    await mk(TENANT_B.id, "bsecret", "ENLISTED");
    expect(await getMemberByUsername(ctxA, "bsecret")).toBeNull();
  });

  it("countCommandMemberships counts COMMAND in this tenant only", async () => {
    await mk(TENANT_A.id, "c1", "COMMAND");
    await mk(TENANT_A.id, "c2", "COMMAND");
    await mk(TENANT_A.id, "e1", "ENLISTED");
    await mk(TENANT_B.id, "cb", "COMMAND");
    expect(await countCommandMemberships(ctxA)).toBe(2);
  });
});
```

- [ ] **Step 3:** red. Report.

- [ ] **Step 4: Create `lib/queries/members.ts`:**

```ts
import { db } from "../db";
import type { TenantContext } from "../tenant";
import type { RankTier } from "../permissions";

const TIER_RANK: Record<RankTier, number> = { COMMAND: 3, OFFICER: 2, NCO: 1, ENLISTED: 0 };

export interface MemberRow {
  id: string; username: string; displayName: string | null; tier: RankTier;
  avatarUrl: string | null; createdAt: Date;
}

export async function listMembers(ctx: TenantContext, search?: string): Promise<MemberRow[]> {
  const q = search?.trim();
  const rows = await db(ctx).membership.findMany({
    where: q && q.length >= 1 ? {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    } : undefined,
    select: { id: true, username: true, displayName: true, tier: true, avatarUrl: true, createdAt: true },
  });
  // Sort tier desc then username asc (Prisma can't order by enum rank directly).
  return [...rows].sort((a, b) =>
    TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.username.localeCompare(b.username));
}

export interface MemberProfile extends MemberRow { bio: string | null; threadCount: number; postCount: number; }

export async function getMemberByUsername(ctx: TenantContext, username: string): Promise<MemberProfile | null> {
  const m = await db(ctx).membership.findFirst({
    where: { username },
    select: {
      id: true, username: true, displayName: true, tier: true, avatarUrl: true, createdAt: true, bio: true,
      _count: { select: { authoredThreads: true, authoredPosts: true } },
    },
  });
  if (!m) return null;
  return {
    id: m.id, username: m.username, displayName: m.displayName, tier: m.tier as RankTier,
    avatarUrl: m.avatarUrl, createdAt: m.createdAt, bio: m.bio,
    threadCount: m._count.authoredThreads, postCount: m._count.authoredPosts,
  };
}

export async function countCommandMemberships(ctx: TenantContext): Promise<number> {
  return db(ctx).membership.count({ where: { tier: "COMMAND" } });
}
```

- [ ] **Step 5:** green (134). lint + tsc clean.
- [ ] **Step 6: Commit** `feat(members): audit helper + tenant-scoped member queries`

---

## Task 3: Self-profile edit action (TDD)

**Files:** `lib/actions/members-core.ts`, extend `tests/integration/members.test.ts`

- [ ] **Step 1: Failing tests — append a describe block:**

```ts
import { updateOwnProfileCore } from "@/lib/actions/members-core";

describe("member self-profile edit", () => {
  beforeEach(async () => { await resetDb(); await seedTwoTenants(); });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("updates own displayName + bio", async () => {
    const m = await mk(TENANT_A.id, "self", "ENLISTED", "Self");
    const r = await updateOwnProfileCore(TENANT_A.id, m.id, { displayName: "New Name", bio: "hi there" });
    expect(r.ok).toBe(true);
    const row = await testPrisma.membership.findUnique({ where: { id: m.id } });
    expect(row?.displayName).toBe("New Name");
    expect(row?.bio).toBe("hi there");
  });

  it("rejects an over-long bio", async () => {
    const m = await mk(TENANT_A.id, "self2", "ENLISTED");
    const r = await updateOwnProfileCore(TENANT_A.id, m.id, { bio: "x".repeat(501) });
    expect(r.ok).toBe(false);
  });

  it("rejects a non-http avatarUrl", async () => {
    const m = await mk(TENANT_A.id, "self3", "ENLISTED");
    const r = await updateOwnProfileCore(TENANT_A.id, m.id, { avatarUrl: "javascript:alert(1)" });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2:** red. Report.

- [ ] **Step 3: Create `lib/actions/members-core.ts` (the self-edit core first; rank core added in Task 4):**

```ts
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
```

- [ ] **Step 4:** green (137). lint + tsc clean.
- [ ] **Step 5: Commit** `feat(members): self-profile edit action`

---

## Task 4: Rank management (TDD) — SECURITY-CRITICAL

**Files:** extend `lib/actions/members-core.ts`, extend `tests/integration/members.test.ts`

Rank changes are COMMAND-only, audit-logged, and protected against demoting/removing the last COMMAND (org lockout). The core takes the actor's resolved tier (server-side; never client-trusted). It also takes `actorAccountId` for the audit row.

- [ ] **Step 1: Failing tests — append a describe block:**

```ts
import { setMemberTierCore } from "@/lib/actions/members-core";

describe("rank management", () => {
  beforeEach(async () => { await resetDb(); await seedTwoTenants(); });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("COMMAND promotes ENLISTED -> OFFICER and writes an audit row", async () => {
    const boss = await mk(TENANT_A.id, "boss", "COMMAND");
    const grunt = await mk(TENANT_A.id, "grunt", "ENLISTED");
    const r = await setMemberTierCore(TENANT_A.id, boss.accountId, "COMMAND", grunt.id, "OFFICER");
    expect(r.ok).toBe(true);
    const row = await testPrisma.membership.findUnique({ where: { id: grunt.id } });
    expect(row?.tier).toBe("OFFICER");
    const audit = await testPrisma.auditLog.findFirst({ where: { tenantId: TENANT_A.id, action: "member.tier.change" } });
    expect(audit).not.toBeNull();
    expect((audit?.detail as any).to).toBe("OFFICER");
  });

  it("OFFICER cannot change tiers", async () => {
    const off = await mk(TENANT_A.id, "off", "OFFICER");
    const grunt = await mk(TENANT_A.id, "grunt", "ENLISTED");
    const r = await setMemberTierCore(TENANT_A.id, off.accountId, "OFFICER", grunt.id, "OFFICER");
    expect(r.ok).toBe(false);
  });

  it("refuses to demote the LAST COMMAND (lockout protection)", async () => {
    const only = await mk(TENANT_A.id, "only", "COMMAND");
    const r = await setMemberTierCore(TENANT_A.id, only.accountId, "COMMAND", only.id, "OFFICER");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/last|only|command/i);
    const row = await testPrisma.membership.findUnique({ where: { id: only.id } });
    expect(row?.tier).toBe("COMMAND");  // unchanged
  });

  it("allows demoting a COMMAND when another COMMAND remains", async () => {
    const a = await mk(TENANT_A.id, "ca", "COMMAND");
    const b = await mk(TENANT_A.id, "cb", "COMMAND");
    const r = await setMemberTierCore(TENANT_A.id, a.accountId, "COMMAND", b.id, "OFFICER");
    expect(r.ok).toBe(true);
  });

  it("cannot change a member in another tenant", async () => {
    const boss = await mk(TENANT_A.id, "boss", "COMMAND");
    const victim = await mk(TENANT_B.id, "victim", "ENLISTED");
    const r = await setMemberTierCore(TENANT_A.id, boss.accountId, "COMMAND", victim.id, "COMMAND");
    expect(r.ok).toBe(false);  // db(ctx) scopes the lookup to tenant A — victim invisible
  });

  it("rejects an invalid tier value", async () => {
    const boss = await mk(TENANT_A.id, "boss", "COMMAND");
    const grunt = await mk(TENANT_A.id, "grunt", "ENLISTED");
    const r = await setMemberTierCore(TENANT_A.id, boss.accountId, "COMMAND", grunt.id, "KING" as never);
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2:** red. Report.

- [ ] **Step 3: Append to `lib/actions/members-core.ts`:**

```ts
import { hasTier, type RankTier } from "../permissions";
import { writeAudit } from "../audit";

const TIER_VALUES = ["ENLISTED", "NCO", "OFFICER", "COMMAND"] as const;
const TierSchema = z.enum(TIER_VALUES);

export async function setMemberTierCore(
  tenantId: string, actorAccountId: string, actorTier: RankTier, targetMembershipId: string, newTier: RankTier,
): Promise<Result> {
  if (!hasTier(actorTier, "COMMAND")) return { ok: false, error: "Requires COMMAND" };
  const parsedTier = TierSchema.safeParse(newTier);
  if (!parsedTier.success) return { ok: false, error: "Invalid rank" };
  const ctx = makeTenantContext(tenantId);

  const target = await db(ctx).membership.findFirst({
    where: { id: targetMembershipId }, select: { id: true, tier: true, username: true },
  });
  if (!target) return { ok: false, error: "Member not found" };
  if (target.tier === newTier) return { ok: true };  // no-op

  // Lockout protection: never let the org drop to zero COMMAND members.
  if (target.tier === "COMMAND" && newTier !== "COMMAND") {
    const commandCount = await db(ctx).membership.count({ where: { tier: "COMMAND" } });
    if (commandCount <= 1) return { ok: false, error: "Cannot demote the last COMMAND member" };
  }

  await db(ctx).membership.update({ where: { id: targetMembershipId }, data: { tier: newTier } });
  await writeAudit(ctx, actorAccountId, "member.tier.change", {
    targetMembershipId, username: target.username, from: target.tier, to: newTier,
  });
  return { ok: true };
}
```

NOTE: the cross-tenant test passes because `db(ctx)` scopes the `findFirst` to tenant A, so tenant B's `victim` is invisible → "Member not found". The lockout count + update + audit are all `db(ctx)` (tenant-injected).

- [ ] **Step 4:** green (143). lint + tsc clean.
- [ ] **Step 5: Commit** `feat(members): COMMAND rank management with last-COMMAND lockout + audit`

---

## Task 5: Session-bound action wrappers

**Files:** `lib/actions/members.ts`

`"use server"` wrappers resolve session→tenant→membership→tier, then delegate. Self-edit uses the viewer's OWN membershipId (the action ignores any client-supplied id). Rank change passes the viewer's tier + accountId.

- [ ] **Step 1: Create `lib/actions/members.ts`:**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "../server/get-tenant";
import { getSessionAccountId } from "../auth";
import { getViewerMembership } from "../authz";
import { updateOwnProfileCore, setMemberTierCore } from "./members-core";

async function ctx() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const m = await getViewerMembership(tenant.id, accountId);
  if (!m) return null;
  return { tenantId: tenant.id, accountId, membershipId: m.id, tier: m.tier };
}

export async function updateOwnProfileAction(input: { displayName?: string; bio?: string; avatarUrl?: string }) {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  // SECURITY: edits the viewer's OWN membership only — id comes from the session, never the client.
  const r = await updateOwnProfileCore(c.tenantId, c.membershipId, input);
  if (r.ok) revalidatePath("/members");
  return r;
}

export async function setMemberTierAction(targetMembershipId: string, newTier: "ENLISTED" | "NCO" | "OFFICER" | "COMMAND") {
  const c = await ctx(); if (!c) return { ok: false as const, error: "Sign in required" };
  // SECURITY: actor tier read server-side from the session membership — never client-trusted.
  const r = await setMemberTierCore(c.tenantId, c.accountId, c.tier, targetMembershipId, newTier);
  if (r.ok) revalidatePath("/admin/members");
  return r;
}
```

- [ ] **Step 2:** gates (143 still green; wrappers exercised via UI + cores). lint + tsc + build clean. Commit `feat(members): session-bound action wrappers`

---

## Task 6: Members UI (directory + profile + self-edit)

**Files:** `app/members/layout.tsx`, `app/members/page.tsx`, `app/members/[username]/page.tsx`, `app/members/[username]/profile-edit.tsx`

Reuse Phase 3a page patterns: `getFullTenantContext()` for tenant, `makeTenantContext` for queries, `getSessionAccountId` + `getViewerMembership` for the viewer. `<Rank tier={t}/>` for rank labels; `<L k="memberPlural" fallback="Members" />` for the page title. Neutral styling, server-side auth.

- [ ] **`app/members/layout.tsx`** — gate: resolve tenant + viewer membership; if no signed-in membership → redirect to `/login` (or `notFound()`). Members directory is visible to any authenticated org member.
- [ ] **`app/members/page.tsx`** — `listMembers(ctx, search)`; render member cards (avatar or initial, displayName/username, `<Rank>` badge, joined date). Search box (client island or `?q=` searchParam — prefer `?q=` server-side to keep it simple). If viewer is COMMAND, show a link to `/admin/members`.
- [ ] **`app/members/[username]/page.tsx`** — `getMemberByUsername(ctx, username)`; if null → `notFound()`. Profile card: avatar, displayName, username, `<Rank>`, joined, bio, thread/post counts. If `username === viewer.username`, render the `<ProfileEdit>` island seeded with current values.
- [ ] **`app/members/[username]/profile-edit.tsx`** — `"use client"`. displayName/bio/avatarUrl fields → `updateOwnProfileAction`; `useTransition`, disable while pending, error display, `router.refresh()` on success.
- [ ] **Gate:** `pnpm build` (routes `/members`, `/members/[username]` dynamic), `pnpm test` 143, lint + tsc clean.
- [ ] **Commit** `feat(members): directory + profile + self-edit UI`

---

## Task 7: Admin rank console (COMMAND)

**Files:** `app/(tenant-admin)/admin/members/page.tsx`, `app/(tenant-admin)/admin/members/rank-controls.tsx`

- [ ] **`page.tsx`** — COMMAND-gated (resolve viewer tier; if `!hasTier(tier,"COMMAND")` → `notFound()`, mirroring the existing admin/config page guard against RSC-payload leak). List all members with current rank; render `<RankControls>` per member.
- [ ] **`rank-controls.tsx`** — `"use client"`. A tier `<select>` + Apply button → `setMemberTierAction(membershipId, newTier)`; `useTransition`, disable while pending, error display (surfaces the last-COMMAND lockout message), `router.refresh()` on success.
- [ ] **Gate:** `pnpm build` (route `/admin/members`), `pnpm test` 143, lint + tsc clean. Live-verify: unauthed/non-COMMAND hit on `/admin/members` → 404; COMMAND sees controls.
- [ ] **Commit** `feat(members): COMMAND rank-management console`

---

## Task 8: Nav + fuzzer confirm

**Files:** nav (wherever tenant nav lives — search for the tenant shell/header), `scripts/tenant-leak-fuzzer.ts`

- [ ] **Step 1:** Add a "Members" nav entry to the tenant-facing navigation (find the shared header/nav component; if none exists, add a simple link in the relevant layout — do NOT invent a whole nav system). Link to `/members`.
- [ ] **Step 2:** The fuzzer already probes `membership` isolation; confirm `pnpm fuzz:leak` (APP_USER_PASSWORD set) is still clean after the new fields (no new table — membership probe covers bio/avatar). If the fuzzer seeds a membership, optionally set a marker bio in tenant B and assert tenant A never sees it. Both passes clean.
- [ ] **Step 3: Commit** `feat(members): nav entry + fuzzer confirm`

---

## Task 9: Gate + PR + CI + review

- [ ] Full gate (test/lint/rule-test/tsc/build/fuzz). Push `feat/phase-3b-members-ranks`, open PR (gh at `C:\Program Files\GitHub CLI\gh.exe`). Watch CI green. STOP for controller holistic review (focus: rank changes COMMAND-only + last-COMMAND lockout + audit row; self-edit can only touch own membership [id from session]; avatarUrl is http(s)-only [no javascript: XSS]; every member read/write via db(ctx); cross-tenant rank change impossible).

---

## Task 10: Deploy (controller, after merge)

- [ ] Deploy per the platform mechanism (`or9@87.99.144.147`): pull src, rebuild `platform-builder:latest` + `platform:latest`, `prisma migrate deploy` (additive nullable columns — safe), `db:setup-rls` (no new tables, but re-run is idempotent/harmless), `docker compose up -d`. Authed prod walk: `/members` lists members; open a profile; edit own bio; as COMMAND promote a test member at `/admin/members`; confirm last-COMMAND demote is blocked; confirm a second tenant's members don't appear.

---

## Self-Review

**Spec coverage:** members directory ✓; profiles ✓; self-edit ✓; rank management (COMMAND, lockout, audit) ✓; rank labels (config + `<Rank>`) ✓.

**Security:** rank change COMMAND-only (actor tier server-side); last-COMMAND lockout prevents org self-lockout; audit row every change; self-edit id from session (no client id); avatarUrl http(s)-only (XSS guard); all via db(ctx) (RLS + lint rule); cross-tenant change impossible (db(ctx) scopes lookup → target invisible).

**Deferrals (logged):** reputation/karma, squadrons, badges/awards, DMs, member removal/ban (delete-membership flow) — own future tasks.

**Type consistency:** `RankTier` from permissions throughout; `MemberRow`/`MemberProfile` exported; `rankLabelKey` maps tier→config key; cores `(tenantId, actor…, target…, …)`; wrappers resolve session→membership→tier; `writeAudit(ctx, actorAccountId, action, detail)`.

---

## Execution

Subagent-driven (sonnet codes, opus reviews). Two-stage review on Task 4 (rank management). Controller deploy (Task 10) after merge + holistic review.
