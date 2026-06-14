# Phase 3e — Handbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. One security review pass on Task 3 (write actions + acknowledgement).

**Goal:** A tenant-scoped handbook system: multiple handbooks per org, each with ordered sections (chapters), a DRAFT/PUBLISHED/ARCHIVED lifecycle, an integer version that bumps on content change, and per-member acknowledgements (re-acknowledge when the version bumps). Members read PUBLISHED handbooks + acknowledge; OFFICER+ edits sections; COMMAND creates/publishes/archives. Flag-gated (`handbook`), tenant-isolated (RLS).

**Architecture:** Three tenant-scoped tables (`handbooks`, `handbook_sections`, `handbook_acknowledgements`) + a `HandbookStatus` enum. Editing/adding/removing a section bumps `Handbook.version`; an acknowledgement stores `versionRead`, so a member whose latest ack `versionRead < handbook.version` is shown a re-acknowledge prompt. Reads/writes via `db(ctx)`. Section body is markdown stored as text, rendered with `whitespace-pre-wrap` (no HTML injection; rich markdown rendering deferred to Phase 4).

**Tech Stack:** Next 16, Prisma 6, RLS (app_user prod), Vitest 4. Reuses Phase 1 `db(ctx)`, Phase 2 `getViewerMembership`/`hasTier`/`getFullTenantContext`/`isFeatureEnabled`/`<L>` (handbookNoun label), Phase 3a-d UI patterns.

**Branch:** `feat/phase-3e-handbook`.

**Scope cut:** sign-off certifications (FG SignOffCategory/Item/Signature system — complex, FG-specific, deferred to its own phase/skill); PDF generation + print view; the handbook-sync skill; YAML source-of-truth; creed block + cover/branch metadata (keep a simple `subtitle`); rich markdown rendering (plain `whitespace-pre-wrap` for now).

**Environment (every task):** `C:\Projects\platform`, Bash tool. Dev DB `or9-pg` :5434. Baseline tests green (confirm in Task 0). Gates: `pnpm test`, `pnpm lint`, `pnpm lint:rule-test`, `pnpm exec tsc --noEmit`; UI tasks also `pnpm build`. Conventional commits, David Smereski, do NOT push. RLS: handbook_* + audit_logs tenant-scoped → ALWAYS `db(ctx)` (no balance mutations here, so no $transaction needed except optional version-bump atomicity). `or9/no-untenanted-query` green. NOTE: `groupBy` not proxy-injected. `gh` at `C:\Program Files\GitHub CLI\gh.exe`.

---

## File Structure
```
prisma/schema.prisma          ← +HandbookStatus; +Handbook/HandbookSection/HandbookAcknowledgement; +Membership.handbookAcks
prisma/migrations/<ts>_phase3e_handbook/
prisma/rls/policies.sql        ← +3 handbook tables
lib/queries/handbook.ts        ← listHandbooks, getHandbookBySlug (+sections), getViewerAck
lib/actions/handbook-core.ts   ← createHandbook(COMMAND), upsertSection/deleteSection(OFFICER, version-bump), setStatus(COMMAND), acknowledgeHandbook(member)
lib/actions/handbook.ts        ← "use server" wrappers
app/handbook/layout.tsx        ← flag gate + membership gate (members read)
app/handbook/page.tsx          ← list PUBLISHED (COMMAND also sees DRAFT/ARCHIVED)
app/handbook/[slug]/page.tsx   ← read sections + acknowledge button + re-ack prompt
app/handbook/[slug]/acknowledge-button.tsx
app/handbook/[slug]/edit/page.tsx ← OFFICER+ section editor + COMMAND publish/archive
app/handbook/[slug]/edit/*.tsx islands
scripts/tenant-leak-fuzzer.ts   ← +handbook probes
tests/integration/handbook.test.ts
```

---

## Task 0: Branch
- [ ] `git checkout main; git pull origin main; git checkout -b feat/phase-3e-handbook`. `pnpm test` baseline (expected 176) green.

---

## Task 1: Schema + enum + RLS + migration
- [ ] **Step 1: Append to `prisma/schema.prisma`:**
```prisma
enum HandbookStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Handbook {
  id        String         @id @default(cuid())
  tenantId  String         @map("tenant_id")
  slug      String         @db.VarChar(60)
  title     String         @db.VarChar(160)
  subtitle  String?        @db.VarChar(300)
  version   Int            @default(1)
  status    HandbookStatus @default(DRAFT)
  createdAt DateTime       @default(now()) @map("created_at")
  updatedAt DateTime       @updatedAt @map("updated_at")

  sections         HandbookSection[]
  acknowledgements HandbookAcknowledgement[]

  @@unique([tenantId, slug])
  @@index([tenantId, status])
  @@map("handbooks")
}

model HandbookSection {
  id         String  @id @default(cuid())
  tenantId   String  @map("tenant_id")
  handbookId String  @map("handbook_id")
  title      String  @db.VarChar(200)
  body       String  @db.Text
  orderIndex Int     @map("order_index")

  handbook Handbook @relation(fields: [handbookId], references: [id], onDelete: Cascade)

  @@index([tenantId, handbookId, orderIndex])
  @@map("handbook_sections")
}

model HandbookAcknowledgement {
  id             String   @id @default(cuid())
  tenantId       String   @map("tenant_id")
  handbookId     String   @map("handbook_id")
  membershipId   String   @map("membership_id")
  versionRead    Int      @map("version_read")
  acknowledgedAt DateTime @default(now()) @map("acknowledged_at")

  handbook   Handbook   @relation(fields: [handbookId], references: [id], onDelete: Cascade)
  membership Membership @relation("handbookAcks", fields: [membershipId], references: [id], onDelete: Cascade)

  @@unique([handbookId, membershipId])
  @@index([tenantId, membershipId])
  @@map("handbook_acknowledgements")
}
```
Add to `Membership`: `handbookAcks HandbookAcknowledgement[] @relation("handbookAcks")`.

- [ ] **Step 2:** `pnpm exec prisma migrate dev --name phase3e_handbook`. Applied + in sync. Drift → STOP+report.
- [ ] **Step 3: Append RLS policies for all 3 tables** to `prisma/rls/policies.sql` (FORCE template; one stanza each for handbooks, handbook_sections, handbook_acknowledgements).
- [ ] **Step 4:** `APP_USER_PASSWORD="rls-test-password-1" pnpm db:setup-rls` → success.
- [ ] **Step 5:** `pnpm test` baseline green, `tsc` clean. Confirm no handbook table in `GLOBAL_TABLES`.
- [ ] **Step 6: Commit** `feat(handbook): schema + status enum + RLS for tenant-scoped handbooks/sections/acks`

---

## Task 2: Queries (TDD)
- [ ] **Step 1: Failing tests `tests/integration/handbook.test.ts`** — cover: listHandbooks returns this tenant's handbooks (optionally filtered to PUBLISHED), scoped; getHandbookBySlug returns handbook + ordered sections, scoped, null for another tenant; getViewerAck returns the member's ack (or null) + an `isStale` derived flag (versionRead < handbook.version). Use helpers (mkMembership, then direct `testPrisma.handbook.create` / `handbookSection.create` / `handbookAcknowledgement.create`). 5-6 tests.
- [ ] **Step 2:** red.
- [ ] **Step 3: Implement `lib/queries/handbook.ts`** — all `db(ctx)`:
  - `listHandbooks(ctx, opts?: { publishedOnly?: boolean })` → `{id, slug, title, subtitle, version, status}[]` (filter status=PUBLISHED when publishedOnly).
  - `getHandbookBySlug(ctx, slug)` → handbook + `sections` (ordered by orderIndex) or null.
  - `getViewerAck(ctx, handbookId, membershipId)` → `{ versionRead, isStale } | null` where isStale = versionRead < current handbook.version (fetch handbook.version too; return null if no ack).
- [ ] **Step 4:** green. lint+tsc clean.
- [ ] **Step 5: Commit** `feat(handbook): tenant-scoped queries (list/read/ack-state)`

---

## Task 3: Write actions (TDD) — security-reviewed
Cores `(tenantId, actorMembershipId, actorTier, …)`. Version bump on section change. Acknowledge records the CURRENT version.
- [ ] **Step 1: Failing tests** — cover:
  - `createHandbookCore` COMMAND only (OFFICER rejected); unique slug per tenant (dup rejected).
  - `upsertSectionCore` OFFICER+ creates/updates a section AND bumps `handbook.version` by 1; ENLISTED rejected.
  - `deleteSectionCore` OFFICER+ deletes + bumps version.
  - `setHandbookStatusCore` COMMAND only (DRAFT→PUBLISHED→ARCHIVED); OFFICER rejected.
  - `acknowledgeHandbookCore` any member: upserts an ack with `versionRead = handbook.version`; re-ack after a version bump updates versionRead.
  - cross-tenant: actor in A cannot edit/ack a handbook in B (db(ctx) → not found).
  ~8 tests.
- [ ] **Step 2:** red.
- [ ] **Step 3: Implement `lib/actions/handbook-core.ts`:**
  - Tier gates first. zod validation (slug regex `^[a-z][a-z0-9-]{1,59}$`, title/subtitle/body lengths, orderIndex int).
  - `upsertSectionCore`: confirm handbook in-tenant (db(ctx) findFirst); upsert section (by id if given, else create); then `db(ctx).handbook.update({ where:{id:handbookId}, data:{ version: { increment: 1 } } })`. (A version bump + section write needn't be a hard transaction for correctness here — a stale version is self-correcting on next edit — but wrap in `prismaGlobal.$transaction`+`setTenantContext` if trivial; otherwise two db(ctx) calls is acceptable. Document the choice.)
  - `acknowledgeHandbookCore`: read handbook.version (db(ctx), must be PUBLISHED — reject ack on DRAFT/ARCHIVED), upsert ack `{ where: handbookId_membershipId, create/update: versionRead }`.
  - `setHandbookStatusCore`: COMMAND; validate status enum; update.
  - `createHandbookCore`: COMMAND; slug-clash check; create (status DRAFT, version 1).
  - Constrained `Result` type (as in treasury/loot cores).
- [ ] **Step 4:** green. lint+tsc clean.
- [ ] **Step 5: Commit** `feat(handbook): write actions (create/section-upsert+version-bump/delete/status/acknowledge) with tier gates`

---

## Task 3b: Security review (controller)
- [ ] Adversarial review of `handbook-core.ts`: tier gates (create/status COMMAND, section-edit OFFICER, ack any member); ack only on PUBLISHED; version bump on every content change; cross-tenant edit/ack impossible (db(ctx)); slug uniqueness; input validation (no body-size/abuse, no slug injection). Fix any findings. (Lighter than the money cores — no balance/atomicity concern.)

---

## Task 4: Wrappers
- [ ] `lib/actions/handbook.ts` mirroring the ctx() pattern; one wrapper per core; revalidatePath("/handbook") + the slug path. Gates: tests green, lint+tsc+build clean. Commit `feat(handbook): session-bound action wrappers`.

---

## Task 5: UI
- [ ] `app/handbook/layout.tsx` — flag gate (`isFeatureEnabled(ctx.features,"handbook")` → notFound) + membership gate (require a membership, any tier → else notFound; handbooks are member-internal). Header (`<L k="handbookNoun" fallback="Handbook"/>` + back links) + children.
- [ ] `app/handbook/page.tsx` — list handbooks: members see PUBLISHED; COMMAND additionally sees DRAFT/ARCHIVED (status badge). Each links to `/handbook/[slug]`. COMMAND sees a "New handbook" form. Empty state.
- [ ] `app/handbook/[slug]/page.tsx` — `getHandbookBySlug`; if null or (status≠PUBLISHED and viewer not OFFICER+) → notFound(). Render title/subtitle + sections (title + body in `whitespace-pre-wrap`). Resolve viewer membership + `getViewerAck`: show an `<AcknowledgeButton handbookId version/>` — "Acknowledge" if no ack, "Re-acknowledge (updated)" if stale, "Acknowledged ✓ (v{n})" if current. OFFICER+ sees an "Edit" link to `/handbook/[slug]/edit`.
- [ ] `app/handbook/[slug]/acknowledge-button.tsx` — `"use client"`, calls acknowledgeHandbookAction, useTransition + refresh.
- [ ] `app/handbook/[slug]/edit/page.tsx` — OFFICER+ gate (page-level notFound if not). Section editor: list sections (title/body/orderIndex) with edit + delete; an add-section form; COMMAND sees publish/archive status controls. Islands for upsert-section, delete-section, set-status.
- [ ] Gates: build (routes `/handbook`, `/handbook/[slug]`, `/handbook/[slug]/edit` dynamic), test green, lint+tsc clean. Commit `feat(handbook): UI — list, read+acknowledge, OFFICER section editor`.

---

## Task 6: Fuzzer + flag
- [ ] Add handbook/handbook_section/handbook_acknowledgement probes to the fuzzer (both passes); seed tenant-B markers; assert tenant-A reads never expose them. `pnpm fuzz:leak` clean both passes. Commit `feat(handbook): leak-fuzzer handbook probes`.

---

## Task 7: Gate + PR + CI + review
- [ ] Full gate. Push, PR (gh, --body-file). CI green. Controller holistic review (focus: tier gates, ack-only-on-published, version bump on edit, cross-tenant impossible, fuzzer clean).

---

## Task 8: Deploy (controller, after merge)
- [ ] Deploy: pull, rebuild both images, `prisma migrate deploy` (3 tables + 1 enum, additive), re-run `db:setup-rls`, `docker compose up -d`. Authed walk: COMMAND creates a handbook + adds sections + publishes; member reads + acknowledges; edit a section → version bumps → member sees re-acknowledge; non-member 404; cross-tenant isolation.

---

## Self-Review
**Spec coverage:** handbooks + sections + status lifecycle ✓; version bump on edit ✓; member acknowledge + stale re-ack ✓; tier gates (COMMAND create/publish, OFFICER edit, member ack) ✓; flag gate + membership gate ✓; RLS + fuzzer ✓.
**Security:** ack only on PUBLISHED; cross-tenant edit/ack impossible (db(ctx)); slug validated; all db(ctx) (RLS + lint).
**Deferrals:** sign-off certifications, PDF/print, sync skill, rich markdown, creed/cover metadata.
**Type consistency:** cores `(tenantId, actorMembershipId, actorTier, …)`; query row types exported; `getViewerAck` returns `{versionRead, isStale}`.

---
## Execution
Subagent-driven (sonnet codes, opus reviews). One security review pass on Task 3. Controller deploy after merge.
