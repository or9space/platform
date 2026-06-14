# Phase 3h — Tournaments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. Self-review on Task 3 (write actions — self-register ownership + tier gates).

**Goal:** A tenant-scoped tournaments feature: an org creates tournaments (name, format, status lifecycle), members self-register while a tournament is OPEN, OFFICER+ manages entries + records final placements, COMMAND deletes (audited). Greenfield (no FG port). Flag-gated (`tournaments`, paid-default), tenant-isolated (RLS).

**Architecture:** Two tenant-scoped tables (`tournaments`, `tournament_entries`) + a `TournamentStatus` enum (DRAFT/OPEN/IN_PROGRESS/COMPLETE). An entry links a participant (Membership) OR a free-text name (off-roster team), with an optional integer `placement` for final standings. Self-registration is owner-bound (participantMembershipId = actor) and only allowed while status=OPEN. Reads via `db(ctx)`. No auto-bracket/match engine in this phase.

**Tech Stack:** Next 16, Prisma 6, RLS, Vitest 4. Reuses Phase 1 `db(ctx)`, Phase 2 helpers, Phase 3b `writeAudit`, Phase 3a-g UI patterns.

**Branch:** `feat/phase-3h-tournaments`.

**Scope cut:** auto-bracket generation, per-match scoring/seeding rounds, prize/loot integration, check-in flow, brackets visualization — deferred. 3h ships create + register + manage entries + record final placements + lifecycle.

**Environment (every task):** `C:\Projects\platform`, Bash tool. Dev DB `or9-pg` :5434. Baseline tests green (confirm Task 0). Gates: `pnpm test`, `pnpm lint`, `pnpm lint:rule-test`, `pnpm exec tsc --noEmit`; UI also `pnpm build`. Conventional commits, David Smereski, do NOT push. RLS: tournament_* + audit_logs tenant-scoped → ALWAYS `db(ctx)`. `or9/no-untenanted-query` green. `groupBy` not proxy-injected. `gh` at `C:\Program Files\GitHub CLI\gh.exe`.

---

## File Structure
```
prisma/schema.prisma          ← +TournamentStatus; +Tournament/TournamentEntry; +Membership.tournamentEntries
prisma/migrations/<ts>_phase3h_tournaments/
prisma/rls/policies.sql        ← +2 tournament tables
lib/queries/tournaments.ts     ← listTournaments, getTournamentWithEntries
lib/actions/tournaments-core.ts ← create/update/setStatus/delete(COMMAND+audit) + addEntry(self-OPEN or OFFICER) / removeEntry(own or OFFICER) / recordPlacement(OFFICER)
lib/actions/tournaments.ts     ← "use server" wrappers
app/tournaments/layout.tsx      ← flag gate + membership gate
app/tournaments/page.tsx        ← list
app/tournaments/[id]/page.tsx   ← detail + entries + register + OFFICER manage
app/tournaments/*-form / *-actions islands
scripts/tenant-leak-fuzzer.ts   ← +tournament probes
tests/integration/tournaments.test.ts
```

---

## Task 0: Branch
- [ ] `git checkout main; git pull origin main; git checkout -b feat/phase-3h-tournaments`. `pnpm test` baseline (expected 215) green.

---

## Task 1: Schema + enum + RLS + migration
- [ ] **Step 1: Append to `prisma/schema.prisma`:**
```prisma
enum TournamentStatus {
  DRAFT
  OPEN
  IN_PROGRESS
  COMPLETE
}

model Tournament {
  id          String           @id @default(cuid())
  tenantId    String           @map("tenant_id")
  name        String           @db.VarChar(160)
  description String?          @db.VarChar(2000)
  format      String?          @db.VarChar(80)
  status      TournamentStatus @default(DRAFT)
  startsAt    DateTime?        @map("starts_at")
  createdByMembershipId String  @map("created_by_membership_id")
  createdAt   DateTime         @default(now()) @map("created_at")
  updatedAt   DateTime         @updatedAt @map("updated_at")

  entries TournamentEntry[]

  @@index([tenantId, status])
  @@map("tournaments")
}

model TournamentEntry {
  id                     String   @id @default(cuid())
  tenantId               String   @map("tenant_id")
  tournamentId           String   @map("tournament_id")
  participantMembershipId String? @map("participant_membership_id")
  displayName            String   @db.VarChar(120)
  seed                   Int?
  placement              Int?
  createdAt              DateTime @default(now()) @map("created_at")

  tournament  Tournament  @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  participant Membership? @relation("tournamentEntries", fields: [participantMembershipId], references: [id], onDelete: SetNull)

  @@unique([tournamentId, participantMembershipId])
  @@index([tenantId, tournamentId])
  @@map("tournament_entries")
}
```
Add to `Membership`: `tournamentEntries TournamentEntry[] @relation("tournamentEntries")`.
NOTE: `@@unique([tournamentId, participantMembershipId])` prevents a member double-registering. Free-text entries have null participantMembershipId — Postgres treats multiple NULLs as distinct, so multiple off-roster entries are allowed (correct).

- [ ] **Step 2:** `pnpm exec prisma migrate dev --name phase3h_tournaments`. Applied + in sync. Drift → STOP+report.
- [ ] **Step 3: Append RLS policies for both tables** to `prisma/rls/policies.sql` (FORCE template).
- [ ] **Step 4:** `APP_USER_PASSWORD="rls-test-password-1" pnpm db:setup-rls` → success.
- [ ] **Step 5:** `pnpm test` baseline green, tsc clean. Confirm tournament tables NOT in `GLOBAL_TABLES`.
- [ ] **Step 6: Commit** `feat(tournaments): schema + status enum + RLS`

---

## Task 2: Queries (TDD)
- [ ] **Step 1: Failing tests `tests/integration/tournaments.test.ts`** — listTournaments tenant-scoped ordered (newest/startsAt); getTournamentWithEntries returns tournament + entries (sorted: placement asc nulls-last, then seed, then displayName) with participant name; null cross-tenant. ~5 tests. Helpers: mkMembership, direct `testPrisma.tournament.create` / `tournamentEntry.create`.
- [ ] **Step 2:** red.
- [ ] **Step 3: Implement `lib/queries/tournaments.ts`** — all `db(ctx)`:
  - `listTournaments(ctx)` → `{id,name,format,status,startsAt,entryCount}[]` (entryCount via `_count`).
  - `getTournamentWithEntries(ctx, id)` → tournament + `entries: {id,displayName,participantMembershipId,seed,placement}[]` (order in JS: placement (nulls last) → seed (nulls last) → displayName). Return null if not found.
  Export row types.
- [ ] **Step 4:** green. lint+tsc clean.
- [ ] **Step 5: Commit** `feat(tournaments): tenant-scoped queries (list/detail+entries)`

---

## Task 3: Write actions (TDD)
Cores `(tenantId, actorMembershipId, actorTier, …)`.
- [ ] **Step 1: Failing tests** — cover:
  - createTournamentCore OFFICER+ (ENLISTED rejected).
  - updateTournamentCore + setStatusCore OFFICER+ (status enum validated).
  - deleteTournamentCore COMMAND only + audit; cascades entries.
  - addEntryCore: (a) a member self-registers when status=OPEN → entry with participantMembershipId=actor, displayName from their membership (pass displayName in; core stamps participant=actor for self); (b) OFFICER adds an entry for anyone or a free-text name regardless of status; (c) self-register rejected when status≠OPEN; (d) double self-register rejected (unique).
  - removeEntryCore: a member removes their OWN entry; OFFICER removes any; a non-owner non-OFFICER cannot.
  - recordPlacementCore OFFICER+ sets an entry's placement.
  - cross-tenant: actor in A cannot touch a tournament/entry in B.
  ~10 tests. Design the addEntry signature to distinguish self vs officer-add — e.g. `addEntryCore(tenantId, actorMembershipId, actorTier, { tournamentId, displayName, participantMembershipId? })`: if `participantMembershipId` is omitted/equals actor → SELF path (requires status OPEN, stamps actor); if a DIFFERENT participantMembershipId or free-text only → requires OFFICER. Specify precisely in the impl + test it.
- [ ] **Step 2:** red.
- [ ] **Step 3: Implement `lib/actions/tournaments-core.ts`** — tier gates; zod (name/format/desc lengths, status enum, seed/placement int ≥0); for addEntry: SELF path when `!participantMembershipId || participantMembershipId === actorMembershipId` → require tournament.status==="OPEN" (read via db(ctx)) and set participantMembershipId=actor, displayName=provided; OFFICER-add path (different participant, or any when actorTier OFFICER+) bypasses the OPEN check; catch unique-violation (P2002) → "Already registered"; removeEntry owner-or-OFFICER (fetch entry, check participantMembershipId===actor or hasTier OFFICER); recordPlacement OFFICER+; delete COMMAND + writeAudit("tournament.delete"). Constrained Result type. All db(ctx).
- [ ] **Step 4:** green. lint+tsc clean.
- [ ] **Step 5: Commit** `feat(tournaments): write actions (create/update/status/delete + entry register/remove/placement) with tier + self-register gates`

---

## Task 4: Wrappers
- [ ] `lib/actions/tournaments.ts` mirroring ctx() pattern; wrappers for each core; the self-register wrapper passes the viewer's displayName (resolve from membership) when none given; revalidatePath. Gates green. Commit `feat(tournaments): session-bound action wrappers`.

---

## Task 5: UI
- [ ] `app/tournaments/layout.tsx` — flag gate (`tournaments`) + membership gate. Header + children.
- [ ] `app/tournaments/page.tsx` — list tournaments (name, status badge, format, startsAt, entryCount), link to `/tournaments/[id]`. OFFICER+ sees `<CreateTournamentForm/>`. Empty state.
- [ ] `app/tournaments/[id]/page.tsx` — `getTournamentWithEntries` (notFound if null). Show name/description/format/status/startsAt. Entries table (placement, displayName, seed). If status=OPEN and the viewer isn't already entered: `<RegisterButton tournamentId/>` (self-register). OFFICER+: `<ManageTournament/>` (set status, add entry for a name, remove entries, record placements). 
- [ ] islands: create-tournament-form, register-button, manage-tournament (status select, add-entry, remove-entry, placement inputs) — useTransition + error + refresh.
- [ ] Gates: build (`/tournaments`, `/tournaments/[id]` dynamic), test green, lint+tsc clean. Commit `feat(tournaments): UI — list, detail, register, OFFICER manage`.

---

## Task 6: Fuzzer + flag
- [ ] Add `tournament`/`tournamentEntry` probes (both passes); seed tenant-B markers; assert tenant-A never sees them. `pnpm fuzz:leak` clean. Commit `feat(tournaments): leak-fuzzer tournament probes`.

---

## Task 7: Gate + PR + CI + review
- [ ] Full gate. Push, PR (gh, --body-file). CI green. Controller holistic review (focus: OFFICER create/manage, COMMAND delete+audit, self-register OPEN-only + owner-stamped + no-double, remove owner-or-OFFICER, cross-tenant impossible, fuzzer clean).

---

## Task 8: Deploy (controller, after merge)
- [ ] Deploy: pull, rebuild both images, `prisma migrate deploy` (2 tables + 1 enum, additive), re-run `db:setup-rls`, `docker compose up -d`. NOTE: `tournaments` flag is paid-default — confirm route 404s on a FREE tenant (flag gate) + walk where enabled: OFFICER creates a tournament, opens it; a member self-registers; OFFICER records placements + completes; COMMAND deletes (audit); cross-tenant isolation.

---

## Self-Review
**Spec coverage:** tournaments + lifecycle ✓; member self-register (OPEN-only, owner-stamped, no-double) ✓; OFFICER manage entries + placements ✓; COMMAND delete+audit ✓; flag + membership gate ✓; RLS + fuzzer ✓.
**Security:** self-register owner-stamped + OPEN-gated; remove owner-or-OFFICER; OFFICER/COMMAND tier gates; cross-tenant impossible (db(ctx)); enum/int validation; all db(ctx) (RLS + lint).
**Deferrals:** auto-bracket, match scoring, prize integration, check-in, bracket viz.
**Type consistency:** cores `(tenantId, actorMembershipId, actorTier, …)`; row types exported; addEntry self-vs-officer path documented.

---
## Execution
Subagent-driven (sonnet codes, opus reviews). Self-review on Task 3. Controller deploy after merge.
