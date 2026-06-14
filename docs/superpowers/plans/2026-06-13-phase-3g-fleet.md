# Phase 3g — Fleet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. Self-review on Task 3 (ownership-bound write actions).

**Goal:** A tenant-scoped, member-owned fleet roster: each member registers the ships they own (name, manufacturer, quantity, public/private, notes). The org fleet view shows all PUBLIC ships across members; a member's own private ships are visible only to them (and OFFICER+). Members manage their OWN ships; COMMAND can moderate (delete) any. Flag-gated (`fleet`, paid-default), tenant-isolated (RLS).

**Architecture:** One tenant-scoped table `fleet_ships` (ownerMembershipId, shipName, manufacturer, quantity, isPublic, notes). Authorship/ownership = `Membership.id`. Edit/delete is **owner-bound** (ownerMembershipId === actor) from the start — COMMAND may delete any (moderation). Reads via `db(ctx)`; org-fleet read returns public ships + the viewer's own.

**Tech Stack:** Next 16, Prisma 6, RLS, Vitest 4. Reuses Phase 1 `db(ctx)`, Phase 2 helpers, Phase 3b `writeAudit` (COMMAND moderation delete), Phase 3a-f UI patterns.

**Branch:** `feat/phase-3g-fleet`.

**Scope cut:** UEX/external ship-data enrichment + the canonical ship catalog (members type a free-text shipName/manufacturer); named loadouts (ShipLoadout); ship images upload (optional imageUrl text field only); fleet-vs-fleet ops. Deferred.

**Environment (every task):** `C:\Projects\platform`, Bash tool. Dev DB `or9-pg` :5434. Baseline tests green (confirm Task 0). Gates: `pnpm test`, `pnpm lint`, `pnpm lint:rule-test`, `pnpm exec tsc --noEmit`; UI also `pnpm build`. Conventional commits, David Smereski, do NOT push. RLS: fleet_ships + audit_logs tenant-scoped → ALWAYS `db(ctx)`. `or9/no-untenanted-query` green. `groupBy` not proxy-injected. `gh` at `C:\Program Files\GitHub CLI\gh.exe`.

---

## File Structure
```
prisma/schema.prisma          ← +FleetShip; +Membership.fleetShips
prisma/migrations/<ts>_phase3g_fleet/
prisma/rls/policies.sql        ← +fleet_ships
lib/queries/fleet.ts           ← listOrgFleet (public + own), getMemberFleet, fleetStats
lib/actions/fleet-core.ts      ← addShip(member, owner=self) / updateShip(owner-bound) / deleteShip(owner or COMMAND+audit)
lib/actions/fleet.ts           ← "use server" wrappers
app/fleet/layout.tsx            ← flag gate + membership gate
app/fleet/page.tsx              ← org roster (public) + my-fleet + add form
app/fleet/*-form / *-actions islands
scripts/tenant-leak-fuzzer.ts   ← +fleet_ship probe
tests/integration/fleet.test.ts
```

---

## Task 0: Branch
- [ ] `git checkout main; git pull origin main; git checkout -b feat/phase-3g-fleet`. `pnpm test` baseline (expected 205) green.

---

## Task 1: Schema + RLS + migration
- [ ] **Step 1: Append to `prisma/schema.prisma`:**
```prisma
model FleetShip {
  id               String   @id @default(cuid())
  tenantId         String   @map("tenant_id")
  ownerMembershipId String  @map("owner_membership_id")
  shipName         String   @db.VarChar(160)
  manufacturer     String?  @db.VarChar(120)
  imageUrl         String?  @db.VarChar(500)
  notes            String?  @db.VarChar(500)
  quantity         Int      @default(1)
  isPublic         Boolean  @default(true) @map("is_public")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  owner Membership @relation("fleetShips", fields: [ownerMembershipId], references: [id], onDelete: Cascade)

  @@index([tenantId, isPublic])
  @@index([tenantId, ownerMembershipId])
  @@map("fleet_ships")
}
```
Add to `Membership`: `fleetShips FleetShip[] @relation("fleetShips")`.

- [ ] **Step 2:** `pnpm exec prisma migrate dev --name phase3g_fleet`. Applied + in sync. Drift → STOP+report.
- [ ] **Step 3: Append RLS policy** for `fleet_ships` to `prisma/rls/policies.sql` (FORCE template).
- [ ] **Step 4:** `APP_USER_PASSWORD="rls-test-password-1" pnpm db:setup-rls` → success.
- [ ] **Step 5:** `pnpm test` baseline green, tsc clean. Confirm `fleetShip` NOT in `GLOBAL_TABLES`.
- [ ] **Step 6: Commit** `feat(fleet): schema + RLS for tenant-scoped member-owned fleet ships`

---

## Task 2: Queries (TDD)
- [ ] **Step 1: Failing tests `tests/integration/fleet.test.ts`** — cover: listOrgFleet returns public ships across members + the viewer's OWN private ships (but NOT others' private), tenant-scoped; getMemberFleet returns one member's ships; fleetStats totals (ship count, total quantity). ~5 tests. Helpers: mkMembership, direct `testPrisma.fleetShip.create`.
- [ ] **Step 2:** red.
- [ ] **Step 3: Implement `lib/queries/fleet.ts`** — all `db(ctx)`:
  - `listOrgFleet(ctx, viewerMembershipId)` → ships where `isPublic = true OR ownerMembershipId = viewerMembershipId`, with owner name; ordered by manufacturer/shipName. (Use a Prisma `OR` in the where; db(ctx) injects tenantId.)
  - `getMemberFleet(ctx, membershipId)` → that member's ships (all, since it's their own page OR shown to OFFICER — caller decides visibility; query returns all of that member's, the page gates).
  - `fleetStats(ctx)` → `{ totalShips, totalQuantity }` via findMany+reduce (no groupBy).
  Export row types (FleetShipRow: id, shipName, manufacturer, imageUrl, notes, quantity, isPublic, ownerMembershipId, ownerName).
- [ ] **Step 4:** green. lint+tsc clean.
- [ ] **Step 5: Commit** `feat(fleet): tenant-scoped fleet queries (org roster/member/stats)`

---

## Task 3: Write actions (TDD) — owner-bound
Cores `(tenantId, actorMembershipId, actorTier, …)`. addShip: owner = actor (the core stamps ownerMembershipId = actorMembershipId; never client-supplied). update/delete: owner-bound (ship.ownerMembershipId === actor) OR COMMAND (moderation; delete writes audit). imageUrl http(s)-only refine (XSS guard, like member avatar).
- [ ] **Step 1: Failing tests** — cover:
  - addShipCore: any member adds a ship; ownerMembershipId is the actor (verify the row's owner = actor even if a different id were somehow passed — the core takes NO owner param, stamps actor).
  - updateShipCore: owner can update own ship; a DIFFERENT member cannot update it (rejected); COMMAND can update any (moderation) — actually keep update OWNER-ONLY (COMMAND moderation = delete only); so: non-owner (even OFFICER) rejected on update.
  - deleteShipCore: owner deletes own; non-owner non-COMMAND rejected; COMMAND deletes any + writes audit.
  - imageUrl: a `javascript:` URL rejected; an https URL accepted.
  - cross-tenant: actor in A cannot update/delete a ship in B (db(ctx) → not found).
  - quantity positive int; shipName required.
  ~9 tests.
- [ ] **Step 2:** red.
- [ ] **Step 3: Implement `lib/actions/fleet-core.ts`:**
  - `addShipCore(tenantId, actorMembershipId, input: {shipName, manufacturer?, imageUrl?, notes?, quantity?, isPublic?})` — any signed-in member; zod (shipName 1..160, quantity int positive ≤10000 default 1, imageUrl http(s) refine, isPublic default true); create with `ownerMembershipId: actorMembershipId` (NEVER from input). Returns {ok, shipId}.
  - `updateShipCore(tenantId, actorMembershipId, shipId, patch)` — fetch ship via db(ctx) bound to owner: `findFirst({ where: { id: shipId, ownerMembershipId: actorMembershipId } })`; if not found → "Ship not found or not yours". Update. (Owner-only; OFFICER/COMMAND do NOT edit others' ships — they can only delete as moderation.)
  - `deleteShipCore(tenantId, actorMembershipId, actorAccountId, actorTier, shipId)` — fetch ship via db(ctx) (any in-tenant); if `ship.ownerMembershipId !== actorMembershipId && !hasTier(actorTier,"COMMAND")` → "Not yours"; delete; if the deleter is NOT the owner (COMMAND moderation), write `writeAudit("fleet.ship.moderate_delete", {...})`.
  - Constrained Result type. imageUrl refine identical to members-core avatarUrl.
- [ ] **Step 4:** green. lint+tsc clean.
- [ ] **Step 5: Commit** `feat(fleet): owner-bound write actions (add/update own, delete own or COMMAND-moderate + audit)`

---

## Task 4: Wrappers
- [ ] `lib/actions/fleet.ts` mirroring ctx() pattern; addShipAction/updateShipAction/deleteShipAction; pass actorMembershipId (+ accountId/tier for delete); revalidatePath("/fleet"). Gates green. Commit `feat(fleet): session-bound action wrappers`.

---

## Task 5: UI
- [ ] `app/fleet/layout.tsx` — flag gate (`fleet`) + membership gate. Header + children.
- [ ] `app/fleet/page.tsx` — resolve viewer membership. `listOrgFleet(ctx, viewerMembershipId)` → org roster (group/show owner name, shipName, manufacturer, quantity, a "private" badge for the viewer's own private ships). A "My Fleet" section (filter to own) with `<AddShipForm/>` + per-own-ship `<ShipActions/>` (edit/delete). COMMAND sees a moderate-delete on any ship. Empty state.
- [ ] islands: add-ship-form (shipName, manufacturer, imageUrl, notes, quantity, isPublic checkbox → addShipAction), ship-actions (edit own inline + delete; COMMAND delete-any) — useTransition + error + refresh.
- [ ] Gates: build (`/fleet` dynamic), test green, lint+tsc clean. Commit `feat(fleet): UI — org roster + my fleet + manage`.

---

## Task 6: Fuzzer + flag
- [ ] Add `fleetShip` probe (both passes); seed tenant-B marker ship; assert tenant-A reads never expose it. `pnpm fuzz:leak` clean. Commit `feat(fleet): leak-fuzzer fleet probe`.

---

## Task 7: Gate + PR + CI + review
- [ ] Full gate. Push, PR (gh, --body-file). CI green. Controller holistic review (focus: owner stamped from actor on add; update owner-bound; delete owner-or-COMMAND+audit; private ships not leaked to non-owners; imageUrl http(s)-only; cross-tenant impossible; fuzzer clean).

---

## Task 8: Deploy (controller, after merge)
- [ ] Deploy: pull, rebuild both images, `prisma migrate deploy` (1 table, additive), re-run `db:setup-rls`, `docker compose up -d`. NOTE: `fleet` flag is paid-default — to walk it on freedomguards (FREE), temporarily enable the flag for that tenant OR just confirm the route 404s when the flag is off (flag gate working) + verify on a flag-on path. Authed walk where enabled: member adds a ship (public + private); another member sees only the public one; owner edits/deletes own; COMMAND moderate-deletes (audit); cross-tenant isolation.

---

## Self-Review
**Spec coverage:** member-owned ships ✓; public org roster + own private ✓; owner-bound edit/delete + COMMAND moderation+audit ✓; flag + membership gate ✓; RLS + fuzzer ✓.
**Security:** owner stamped from actor (never client); update owner-bound; delete owner-or-COMMAND; private ships invisible to non-owners (query OR clause); imageUrl http(s)-only; cross-tenant impossible (db(ctx)); all db(ctx) (RLS + lint).
**Deferrals:** UEX enrichment + ship catalog, loadouts, image upload, fleet ops.
**Type consistency:** cores `(tenantId, actorMembershipId, …)`; FleetShipRow exported.

---
## Execution
Subagent-driven (sonnet codes, opus reviews). Self-review on Task 3 (ownership binding — pattern proven in loot/members). Controller deploy after merge.
