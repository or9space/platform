# Phase 3f — Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. One self-review pass on Task 3 (write actions — no money/balance, tier-gated CRUD).

**Goal:** A tenant-scoped org inventory: a catalog of items (name, category, UNIQUE/FUNGIBLE kind) and holdings of those items (quantity, optional custodian Membership, lifecycle state). OFFICER+ manages the catalog + holdings; COMMAND deletes; members view. Flag-gated (`inventory`), tenant-isolated (RLS).

**Architecture:** Two tenant-scoped tables (`inventory_items` = catalog, `inventory_holdings` = held stock) + `InventoryCategory`, `InventoryKind`, `HoldingState` enums (simplified from FreedomGuard's OrgItem set). A holding references a catalog item + an optional custodian Membership; UNIQUE items hold quantity 1, FUNGIBLE hold a count. Reads/writes via `db(ctx)`.

**Tech Stack:** Next 16, Prisma 6, RLS, Vitest 4. Reuses Phase 1 `db(ctx)`, Phase 2 `getViewerMembership`/`hasTier`/`getFullTenantContext`/`isFeatureEnabled`, Phase 3b `writeAudit` (for COMMAND deletes), Phase 3a-e UI patterns.

**Branch:** `feat/phase-3f-inventory`.

**Scope cut:** loans/lending flow, request/approval flow, external catalog sync (SC wiki/UEX), confidence/source provenance, per-item personal visibility, the full verb-ledger + loss causes, loot-redemption link — all deferred. 3f ships catalog + holdings + custodian + state + quantity.

**Environment (every task):** `C:\Projects\platform`, Bash tool. Dev DB `or9-pg` :5434. Baseline tests green (confirm Task 0). Gates: `pnpm test`, `pnpm lint`, `pnpm lint:rule-test`, `pnpm exec tsc --noEmit`; UI tasks also `pnpm build`. Conventional commits, David Smereski, do NOT push. RLS: inventory_* + audit_logs tenant-scoped → ALWAYS `db(ctx)`. `or9/no-untenanted-query` green. `groupBy` not proxy-injected. `gh` at `C:\Program Files\GitHub CLI\gh.exe`.

---

## File Structure
```
prisma/schema.prisma          ← +InventoryCategory/InventoryKind/HoldingState enums; +InventoryItem/InventoryHolding; +Membership.heldInventory
prisma/migrations/<ts>_phase3f_inventory/
prisma/rls/policies.sql        ← +2 inventory tables
lib/inventory.ts               ← INVENTORY_CATEGORIES, INVENTORY_KINDS, HOLDING_STATES, label maps
lib/queries/inventory.ts       ← listItems, getItem, listHoldings (+item +custodian), listHoldingsByItem
lib/actions/inventory-core.ts  ← createItem/updateItem/deleteItem(COMMAND+audit); createHolding/updateHolding/deleteHolding (OFFICER)
lib/actions/inventory.ts       ← "use server" wrappers
app/inventory/layout.tsx        ← flag gate + membership gate
app/inventory/page.tsx          ← catalog + holdings summary
app/inventory/[itemId]/page.tsx ← item detail + its holdings + OFFICER manage
app/inventory/*-form/*-actions islands
scripts/tenant-leak-fuzzer.ts   ← +inventory probes
tests/integration/inventory.test.ts
```

---

## Task 0: Branch
- [ ] `git checkout main; git pull origin main; git checkout -b feat/phase-3f-inventory`. `pnpm test` baseline (expected 190) green.

---

## Task 1: Schema + enums + RLS + migration
- [ ] **Step 1: Append to `prisma/schema.prisma`:**
```prisma
enum InventoryCategory {
  WEAPON
  ARMOR
  SHIP_COMPONENT
  CONSUMABLE
  AMMO
  ATTACHMENT
  CONTAINER
  MISC
}

enum InventoryKind {
  UNIQUE
  FUNGIBLE
}

enum HoldingState {
  ACTIVE
  LOST
  DESTROYED
  RETIRED
}

model InventoryItem {
  id          String            @id @default(cuid())
  tenantId    String            @map("tenant_id")
  name        String            @db.VarChar(160)
  category    InventoryCategory @default(MISC)
  kind        InventoryKind     @default(UNIQUE)
  description String?           @db.VarChar(1000)
  createdAt   DateTime          @default(now()) @map("created_at")

  holdings InventoryHolding[]

  @@index([tenantId, category])
  @@index([tenantId, name])
  @@map("inventory_items")
}

model InventoryHolding {
  id                    String       @id @default(cuid())
  tenantId              String       @map("tenant_id")
  itemId                String       @map("item_id")
  custodianMembershipId String?      @map("custodian_membership_id")
  quantity              Int          @default(1)
  state                 HoldingState @default(ACTIVE)
  notes                 String?      @db.VarChar(500)
  createdAt             DateTime     @default(now()) @map("created_at")
  updatedAt             DateTime     @updatedAt @map("updated_at")

  item      InventoryItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  custodian Membership?   @relation("heldInventory", fields: [custodianMembershipId], references: [id], onDelete: SetNull)

  @@index([tenantId, itemId])
  @@index([tenantId, state])
  @@map("inventory_holdings")
}
```
Add to `Membership`: `heldInventory InventoryHolding[] @relation("heldInventory")`.

- [ ] **Step 2:** `pnpm exec prisma migrate dev --name phase3f_inventory`. Applied + in sync. Drift → STOP+report.
- [ ] **Step 3: Append RLS policies for both tables** to `prisma/rls/policies.sql` (FORCE template; inventory_items, inventory_holdings).
- [ ] **Step 4:** `APP_USER_PASSWORD="rls-test-password-1" pnpm db:setup-rls` → success.
- [ ] **Step 5:** `pnpm test` baseline green, tsc clean. Confirm inventory tables NOT in `GLOBAL_TABLES`.
- [ ] **Step 6: Commit** `feat(inventory): schema + enums + RLS for tenant-scoped catalog + holdings`

---

## Task 2: Constants + queries (TDD)
- [ ] **Step 1: Create `lib/inventory.ts`:** export `INVENTORY_CATEGORIES`/`INVENTORY_KINDS`/`HOLDING_STATES` const arrays + types + `CATEGORY_LABELS` map.
- [ ] **Step 2: Failing tests `tests/integration/inventory.test.ts`** — cover: listItems tenant-scoped + ordered; getItem returns item + null cross-tenant; listHoldings returns holdings with item name + custodian name, tenant-scoped; listHoldingsByItem; a holdings total quantity per item. ~5-6 tests. Helpers: mkMembership, direct `testPrisma.inventoryItem.create` / `inventoryHolding.create`.
- [ ] **Step 3:** red.
- [ ] **Step 4: Implement `lib/queries/inventory.ts`** — all `db(ctx)`:
  - `listItems(ctx, search?)` → `{id,name,category,kind,description}[]` ordered by name; optional name contains filter.
  - `getItem(ctx, itemId)` → item or null.
  - `listHoldings(ctx, filter?: {itemId?, state?})` → `{id,itemId,itemName,quantity,state,notes,custodianName|null}[]` (join item + custodian; map custodianName = displayName ?? username ?? null).
  - `listHoldingsByItem(ctx, itemId)` → same shape filtered to one item.
- [ ] **Step 5:** green. lint+tsc clean.
- [ ] **Step 6: Commit** `feat(inventory): constants + tenant-scoped catalog/holdings queries`

---

## Task 3: Write actions (TDD)
Cores `(tenantId, actorMembershipId, actorTier, …)`. Catalog + holding management OFFICER+; deletes COMMAND + audit. Validate quantity (positive int), enums, name/notes lengths. Custodian (if given) must be a Membership in this tenant (db(ctx) findFirst check).
- [ ] **Step 1: Failing tests** — cover:
  - createItemCore OFFICER+ (ENLISTED rejected); invalid category/kind rejected.
  - updateItemCore OFFICER+ updates name/category/description.
  - deleteItemCore COMMAND only + audit row; cascades holdings (FK).
  - createHoldingCore OFFICER+: quantity positive; state defaults ACTIVE; optional custodian must be in-tenant (a foreign-tenant custodianMembershipId → rejected).
  - updateHoldingCore OFFICER+ changes quantity/state/custodian/notes.
  - deleteHoldingCore OFFICER+.
  - cross-tenant: actor in A cannot update/delete an item/holding in B (db(ctx) → not found).
  ~9 tests.
- [ ] **Step 2:** red.
- [ ] **Step 3: Implement `lib/actions/inventory-core.ts`** — tier gates first; zod (enums from lib/inventory, quantity int positive ≤ 1e6, name 1..160, notes ≤500); custodian-in-tenant check via db(ctx).membership.findFirst when custodianMembershipId provided; deleteItem/deleteHolding via db(ctx).delete after in-tenant findFirst; deleteItemCore writes `writeAudit("inventory.item.delete", {...})`. Constrained Result type. (No balance/atomicity — plain db(ctx), no $transaction needed; deletes audit-after is fine, consistent with the accepted pattern.)
- [ ] **Step 4:** green. lint+tsc clean.
- [ ] **Step 5: Commit** `feat(inventory): write actions (item + holding CRUD, OFFICER manage, COMMAND delete + audit)`

---

## Task 4: Wrappers
- [ ] `lib/actions/inventory.ts` mirroring the ctx() pattern; one wrapper per core; revalidatePath("/inventory"). Gates: tests green, lint+tsc+build clean. Commit `feat(inventory): session-bound action wrappers`.

---

## Task 5: UI
- [ ] `app/inventory/layout.tsx` — flag gate (`inventory`) + membership gate (require membership → else notFound). Header + children.
- [ ] `app/inventory/page.tsx` — catalog list (`listItems`, optional `?q=` search) + a holdings summary (total quantity per item from `listHoldings`). Each item links `/inventory/[itemId]`. OFFICER+ sees `<CreateItemForm/>`. Empty state.
- [ ] `app/inventory/[itemId]/page.tsx` — `getItem` (notFound if null); show name/category/kind/description; `listHoldingsByItem` table (quantity, state badge, custodian, notes). OFFICER+ sees `<CreateHoldingForm itemId/>` + per-holding `<HoldingActions/>` (edit/delete); COMMAND sees a delete-item control.
- [ ] islands: create-item, update-item, create-holding, holding-actions (edit quantity/state/custodian/notes + delete), delete-item — useTransition + error + refresh.
- [ ] Gates: build (routes `/inventory`, `/inventory/[itemId]` dynamic), test green, lint+tsc clean. Commit `feat(inventory): UI — catalog, item detail, holdings management`.

---

## Task 6: Fuzzer + flag
- [ ] Add `inventoryItem`/`inventoryHolding` probes (both passes); seed tenant-B markers; assert tenant-A reads never expose them. `pnpm fuzz:leak` clean. Commit `feat(inventory): leak-fuzzer inventory probes`.

---

## Task 7: Gate + PR + CI + review
- [ ] Full gate. Push, PR (gh, --body-file). CI green. Controller holistic review (focus: tier gates [OFFICER manage, COMMAND delete+audit], custodian-in-tenant check, cross-tenant impossible, quantity/enum validation, fuzzer clean).

---

## Task 8: Deploy (controller, after merge)
- [ ] Deploy: pull, rebuild both images, `prisma migrate deploy` (2 tables + 3 enums, additive), re-run `db:setup-rls`, `docker compose up -d`. Authed walk: OFFICER creates an item + a holding (with custodian); member views catalog + item detail; COMMAND deletes an item (audit); non-member 404; cross-tenant isolation.

---

## Self-Review
**Spec coverage:** catalog (items) + holdings (quantity/custodian/state) ✓; OFFICER manage / COMMAND delete+audit / member view ✓; flag gate + membership gate ✓; RLS + fuzzer ✓.
**Security:** tier gates; custodian must be in-tenant; cross-tenant impossible (db(ctx)); quantity/enum validated; deletes audited; all db(ctx) (RLS + lint).
**Deferrals:** loans, request flow, external sync, provenance, verb-ledger, loss causes, visibility, loot-redemption link.
**Type consistency:** enums from `lib/inventory.ts`; query row types exported; cores `(tenantId, actorMembershipId, actorTier, …)`.

---
## Execution
Subagent-driven (sonnet codes, opus reviews). Self-review on Task 3. Controller deploy after merge.
