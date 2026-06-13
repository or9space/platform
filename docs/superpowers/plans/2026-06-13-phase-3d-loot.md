# Phase 3d — Loot Points Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. Two-stage review on Task 3 (balance-mutating write actions — spend/transfer/adjust).

**Goal:** A tenant-scoped loot-points system: participants (linked to a Membership or an off-site name), dated sessions with an attendance grid (PRESENT/LATE/ABSENT earning points), and a transaction ledger (SPEND/TRANSFER/ADJUST). Each member's balance = Σ(attendance points) + Σ(transactions). OFFICER+ manages sessions/attendance/spend; COMMAND adjusts (audited); members transfer points peer-to-peer. Flag-gated (`loot`), tenant-isolated (RLS).

**Architecture:** Four tenant-scoped tables (`loot_members`, `loot_sessions`, `loot_attendance`, `loot_transactions`) with `tenant_id` + RLS. **Points stored as integer tenths** (PRESENT=10, LATE=5, ABSENT=0) — no Prisma Decimal / float drift; a `formatPoints(tenths)` helper renders `1.0`/`0.5`. Balance = Σ(attendance tenths) + Σ(transaction tenths, signed). Balance-mutating ops (spend, transfer) use atomic Serializable transactions with a balance guard so concurrent spends can't overdraw. Reads/writes via `db(ctx)`.

**Tech Stack:** Next 16, Prisma 6, RLS (app_user prod), Vitest 4. Reuses Phase 1 `db(ctx)`/`setTenantContext`, Phase 2 `getViewerMembership`/`hasTier`/`getFullTenantContext`/`isFeatureEnabled`/`<L>`, Phase 3b `writeAudit`, the Phase 3b/3c atomic-tx pattern, Phase 3a/b/c UI patterns.

**Branch:** `feat/phase-3d-loot`.

**Scope cut:** configurable earn rates (hardcode PRESENT=10/LATE=5 tenths; config-future); Calendar/Event session linkage (no Event model — defer); item redemption link (inventory phase); per-member streaks/stats fanciness (Phase 4 polish). Off-site (unlinked) loot members ARE supported (displayName without membership).

**Environment (every task):** `C:\Projects\platform`, Bash tool. Dev DB `or9-pg` :5434. Baseline tests green at start (confirm in Task 0). Gates: `pnpm test`, `pnpm lint`, `pnpm lint:rule-test`, `pnpm exec tsc --noEmit`; UI tasks also `pnpm build`. Conventional commits, David Smereski, do NOT push. RLS: all loot_* + audit_logs tenant-scoped → ALWAYS `db(ctx)`, never `prismaGlobal` (except the Phase 1.5 `prismaGlobal.$transaction`+`setTenantContext` atomic pattern for balance mutations). ESLint `or9/no-untenanted-query` green. NOTE (from 3c): `groupBy` is NOT proxy-injected — use findMany/aggregate. `gh` at `C:\Program Files\GitHub CLI\gh.exe`.

---

## File Structure (additions)

```
prisma/schema.prisma          ← +LootAttendanceStatus, +LootTxnType enums; +LootMember/Session/Attendance/Transaction; +Membership.lootMember
prisma/migrations/<ts>_phase3d_loot/
prisma/rls/policies.sql        ← +4 loot tables
lib/loot.ts                    ← ATTENDANCE_POINTS (tenths), formatPoints, TXN_TYPES, ATTENDANCE_STATUSES
lib/queries/loot.ts            ← getMemberBalance, listLootMembersWithBalances, getSessionWithGrid, listSessions, listMemberTransactions
lib/actions/loot-core.ts       ← createLootMember/createSession/setAttendance (OFFICER); spendLoot (OFFICER, balance guard); adjustLoot (COMMAND+audit); transferLoot (member↔member, atomic balance guard)
lib/actions/loot.ts            ← "use server" wrappers
app/loot/layout.tsx            ← flag gate (loot)
app/loot/page.tsx              ← leaderboard (members + balances)
app/loot/[memberId]/page.tsx   ← member detail + txn history + spend/adjust/transfer islands
app/loot/sessions/page.tsx     ← sessions list + attendance grid (OFFICER)
app/loot/*-form.tsx / *-actions.tsx islands
scripts/tenant-leak-fuzzer.ts   ← +loot_member/session/attendance/transaction probes
tests/integration/loot.test.ts  ← queries + balance math + actions (spend guard, transfer atomicity, tier gates, isolation)
```

---

## Task 0: Branch
- [ ] `git checkout main; git pull origin main; git checkout -b feat/phase-3d-loot`. Run `pnpm test`, record baseline (expected 159) — all green.

---

## Task 1: Schema + enums + RLS + migration

- [ ] **Step 1: Append to `prisma/schema.prisma`:**
```prisma
enum LootAttendanceStatus {
  PRESENT
  LATE
  ABSENT
}

enum LootTxnType {
  SPEND
  TRANSFER_IN
  TRANSFER_OUT
  ADJUST
}

model LootMember {
  id           String   @id @default(cuid())
  tenantId     String   @map("tenant_id")
  membershipId String?  @map("membership_id")
  displayName  String   @db.VarChar(120)
  createdAt    DateTime @default(now()) @map("created_at")

  membership   Membership?       @relation("lootMember", fields: [membershipId], references: [id], onDelete: SetNull)
  attendance   LootAttendance[]
  transactions LootTransaction[] @relation("lootTxnMember")
  relatedTxns  LootTransaction[] @relation("lootTxnRelated")

  @@unique([tenantId, membershipId])
  @@index([tenantId])
  @@map("loot_members")
}

model LootSession {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")
  label       String   @db.VarChar(160)
  sessionDate DateTime @map("session_date")
  notes       String?  @db.VarChar(500)
  createdByMembershipId String @map("created_by_membership_id")
  createdAt   DateTime @default(now()) @map("created_at")

  attendance LootAttendance[]

  @@index([tenantId, sessionDate])
  @@map("loot_sessions")
}

model LootAttendance {
  id        String               @id @default(cuid())
  tenantId  String               @map("tenant_id")
  sessionId String               @map("session_id")
  memberId  String               @map("member_id")
  status    LootAttendanceStatus @default(PRESENT)
  updatedAt DateTime             @updatedAt @map("updated_at")

  session LootSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  member  LootMember  @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([sessionId, memberId])
  @@index([tenantId, memberId])
  @@map("loot_attendance")
}

model LootTransaction {
  id              String      @id @default(cuid())
  tenantId        String      @map("tenant_id")
  memberId        String      @map("member_id")
  amountTenths    Int         @map("amount_tenths")   // signed points ×10
  type            LootTxnType
  note            String?     @db.VarChar(500)
  relatedMemberId String?     @map("related_member_id")
  createdByMembershipId String @map("created_by_membership_id")
  createdAt       DateTime    @default(now()) @map("created_at")

  member        LootMember  @relation("lootTxnMember", fields: [memberId], references: [id], onDelete: Cascade)
  relatedMember LootMember? @relation("lootTxnRelated", fields: [relatedMemberId], references: [id], onDelete: SetNull)

  @@index([tenantId, memberId, createdAt])
  @@map("loot_transactions")
}
```
Add to `Membership` relations:
```prisma
  lootMember LootMember[] @relation("lootMember")
```
(One membership maps to at most one LootMember per tenant via `@@unique([tenantId, membershipId])`, but relation is a list for Prisma; treat as 0/1 in code.)

- [ ] **Step 2:** `pnpm exec prisma migrate dev --name phase3d_loot`. Applied + in sync. Drift/shadow error → STOP+report.
- [ ] **Step 3: Append RLS policies for ALL 4 tables** to `prisma/rls/policies.sql` (same FORCE template; read the file for style):
```sql
ALTER TABLE loot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE loot_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON loot_members;
CREATE POLICY tenant_isolation ON loot_members
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
-- repeat identically for loot_sessions, loot_attendance, loot_transactions
```
- [ ] **Step 4:** `APP_USER_PASSWORD="rls-test-password-1" pnpm db:setup-rls` → "RLS roles + policies applied".
- [ ] **Step 5:** `pnpm test` baseline green, `pnpm exec tsc --noEmit` clean. Confirm none of the 4 loot tables are in `GLOBAL_TABLES`.
- [ ] **Step 6: Commit** `feat(loot): schema + enums + RLS for tenant-scoped loot members/sessions/attendance/transactions`

---

## Task 2: Constants + queries (TDD)

- [ ] **Step 1: Create `lib/loot.ts`:**
```ts
import type { LootAttendanceStatus } from "@prisma/client";

export const ATTENDANCE_POINTS: Record<"PRESENT" | "LATE" | "ABSENT", number> = {
  PRESENT: 10, LATE: 5, ABSENT: 0,   // tenths of a point
};
export const ATTENDANCE_STATUSES = ["PRESENT", "LATE", "ABSENT"] as const;
export const TXN_TYPES = ["SPEND", "TRANSFER_IN", "TRANSFER_OUT", "ADJUST"] as const;

/** tenths → human string, e.g. 25 → "2.5", 10 → "1" */
export function formatPoints(tenths: number): string {
  const whole = Math.trunc(tenths / 10);
  const frac = Math.abs(tenths % 10);
  return frac === 0 ? String(whole) : `${whole}.${frac}`;
}
```
(If importing `LootAttendanceStatus` from `@prisma/client` is awkward, drop the import and use the literal union — keep it simple.)

- [ ] **Step 2: Failing query tests `tests/integration/loot.test.ts`** — cover: getMemberBalance = Σ attendance tenths + Σ txn tenths (signed), tenant-scoped; listLootMembersWithBalances returns members sorted by balance desc, scoped; getSessionWithGrid returns attendance rows; another tenant's loot invisible. Use helpers mirroring treasury.test.ts (`mkMember` for Membership, plus a `mkLootMember(tenantId, displayName, membershipId?)`, `mkSession`, `setAtt`, `txn`). Assert balance arithmetic precisely (e.g. PRESENT(10)+LATE(5)+SPEND(-30) = -15, or with positive setup). Write 5-6 query tests.

- [ ] **Step 3:** red. Report.

- [ ] **Step 4: Implement `lib/queries/loot.ts`** — all via `db(ctx)`; balance computed by two findMany+reduce (attendance → map status to ATTENDANCE_POINTS; transactions → sum amountTenths). Provide:
  - `getMemberBalance(ctx, lootMemberId): Promise<number>` (tenths)
  - `listLootMembersWithBalances(ctx): Promise<{id, displayName, membershipId, balanceTenths}[]>` sorted balance desc (compute balances with a couple of bulk findMany + in-memory aggregation keyed by memberId — avoid N+1; do NOT use groupBy)
  - `getSessionWithGrid(ctx, sessionId)` → session + attendance rows (member displayName + status)
  - `listSessions(ctx)` newest-first
  - `listMemberTransactions(ctx, lootMemberId)` newest-first
Export row types.

- [ ] **Step 5:** green. lint + tsc clean.
- [ ] **Step 6: Commit** `feat(loot): constants + tenant-scoped balance/leaderboard/session queries`

---

## Task 3: Write actions (TDD) — SECURITY-CRITICAL (points balances)

Cores take `(tenantId, actorMembershipId, actorTier, …)`. Balance-mutating ops (spend, transfer) MUST be atomic with a balance guard (Serializable `prismaGlobal.$transaction` + `setTenantContext`) so concurrent operations cannot overdraw. Adjust (COMMAND) writes an audit row.

- [ ] **Step 1: Failing tests** — cover:
  - `createLootMemberCore` OFFICER+ (ENLISTED rejected); links a membership or takes an off-site displayName; rejects a 2nd loot member for the same membership (the @@unique).
  - `createSessionCore` OFFICER+.
  - `setAttendanceCore` OFFICER+ upserts status (PRESENT→LATE changes the member's balance accordingly); ABSENT = 0.
  - `spendLootCore` OFFICER+: deducts a SPEND txn; REJECTS if amount > current balance (no overdraw); rejects non-positive amount.
  - `adjustLootCore` COMMAND only: writes an ADJUST txn (can be +/−) + an audit row; OFFICER rejected.
  - `transferLootCore`: moves points member A→B — writes TRANSFER_OUT (−amt) on A + TRANSFER_IN (+amt) on B atomically; REJECTS if A's balance < amount; rejects A==B; rejects if B is another tenant's member (db(ctx) → invisible); both txns appear or neither (atomic).
  - cross-tenant: an actor in tenant A cannot spend/adjust a tenant-B loot member (invisible).
  Write ~10 tests. Amounts in tenths.

- [ ] **Step 2:** red. Report.

- [ ] **Step 3: Implement `lib/actions/loot-core.ts`.** Patterns:
  - Tier gates first (`hasTier`).
  - Validation via zod (positive int tenths, ≤ a sane cap e.g. 10_000_0 tenths; note/displayName lengths).
  - Balance reads via the query helper (or inline findMany+reduce) INSIDE the Serializable tx for spend/transfer, then the guard, then the insert(s) — all on `tx` with `setTenantContext(tx, tenantId)` and explicit tenantId, mirroring `lib/actions/claim.ts` + the treasury delete fix. For transfer: compute A balance inside tx, guard `>= amount`, insert TRANSFER_OUT(A,−amt) + TRANSFER_IN(B,+amt) in the same tx. For spend: balance guard + SPEND(−amt) insert in tx.
  - `createLootMember`/`createSession`/`setAttendance` are non-balance — plain `db(ctx)` calls are fine.
  - `adjustLootCore`: COMMAND gate; insert ADJUST txn + writeAudit("loot.adjust", {...}) — wrap in the same atomic tx (insert + audit together) like the treasury delete.
  - Return `{ok}` / `{ok:false,error}` with the constrained `Result` type.

- [ ] **Step 4:** green. lint + tsc clean.
- [ ] **Step 5: Commit** `feat(loot): write actions (member/session/attendance/spend/adjust/transfer) with atomic balance guards + audit`

---

## Task 4: Session-bound wrappers
- [ ] Create `lib/actions/loot.ts` mirroring `lib/actions/treasury.ts` ctx() pattern; one wrapper per core; resolve session→tenant→membership→tier; pass actorMembershipId + actorTier; revalidatePath("/loot"). For transfer, the actor is the sender — the wrapper resolves the sender's own LootMember id from their membership (look it up via db(ctx); if the signed-in member has no LootMember row, return an error "You are not a loot participant"). Gates: tests green, lint+tsc+build clean. Commit `feat(loot): session-bound action wrappers`.

---

## Task 5: Loot UI
- [ ] `app/loot/layout.tsx` — flag gate (`isFeatureEnabled(ctx.features,"loot")` → notFound). Loot is member-visible (org-public leaderboard, per FG) — gate only the flag, not tier. Header + children.
- [ ] `app/loot/page.tsx` — leaderboard: `listLootMembersWithBalances`, rank + displayName + `formatPoints(balance)`. If viewer OFFICER+, link to `/loot/sessions` + show "Add participant" form. 
- [ ] `app/loot/[memberId]/page.tsx` — member detail: balance, txn history (`listMemberTransactions`, formatPoints, type badges). OFFICER+ sees spend/adjust(COMMAND) islands; any member sees a "transfer to" form IF they have their own LootMember (transfer from self to this member).
- [ ] `app/loot/sessions/page.tsx` — OFFICER+ (resolve tier; notFound if not). Sessions list + create-session form + per-session attendance grid (member rows × status select → setAttendanceAction).
- [ ] client islands: add-participant, create-session, attendance-cell, spend, adjust, transfer — each useTransition + error + router.refresh.
- [ ] Gates: build (routes `/loot`, `/loot/[memberId]`, `/loot/sessions` dynamic), test green, lint+tsc clean. Commit `feat(loot): UI — leaderboard, member detail, sessions/attendance grid`.

---

## Task 6: Fuzzer + flag
- [ ] Add `loot_member`/`loot_session`/`loot_attendance`/`loot_transaction` probes to the fuzzer (both passes), mirroring existing probes; seed tenant-B markers; assert tenant-A reads never expose them. `APP_USER_PASSWORD=… pnpm fuzz:leak` — both passes clean. Commit `feat(loot): leak-fuzzer loot probes`.

---

## Task 7: Gate + PR + CI + review
- [ ] Full gate. Push, open PR (gh full path, --body-file). Watch CI green. STOP for controller holistic review (focus: balance math correct in tenths; spend/transfer atomic + no overdraw under concurrency; transfer both-or-neither; adjust COMMAND+audit; cross-tenant invisible; all db(ctx); fuzzer clean).

---

## Task 8: Deploy (controller, after merge)
- [ ] Deploy per mechanism (`or9@87.99.144.147`): pull, rebuild both images, `prisma migrate deploy` (4 tables + 2 enums, additive), re-run `db:setup-rls`, `docker compose up -d`. Authed prod walk: OFFICER adds a participant + session + marks attendance; check leaderboard balance; spend (verify overdraw blocked); COMMAND adjust (audit); a member transfers to another; non-OFFICER can view leaderboard but not sessions; cross-tenant isolation.

---

## Self-Review
**Spec coverage:** loot members (linked + off-site) ✓; sessions + attendance grid (PRESENT/LATE/ABSENT → points) ✓; balance = attendance + ledger ✓; spend (OFFICER, no overdraw) ✓; adjust (COMMAND + audit) ✓; transfer (atomic, balance-guarded) ✓; flag gate ✓; RLS + fuzzer ✓.
**Security:** integer tenths (no float drift); spend/transfer atomic Serializable + balance guard (no overdraw / no negative via concurrency); transfer both-or-neither; adjust COMMAND+audit; all db(ctx) (RLS + lint); cross-tenant invisible.
**Deferrals:** configurable earn rates; event/calendar link; item redemption; streaks/stats polish.
**Type consistency:** tenths everywhere; `formatPoints` for display; cores `(tenantId, actorMembershipId, actorTier, …)`; wrappers resolve session→membership→tier + sender LootMember; `writeAudit` for adjust.

---

## Execution
Subagent-driven (sonnet codes, opus reviews). Two-stage review on Task 3. Controller deploy (Task 8) after merge + holistic review.
