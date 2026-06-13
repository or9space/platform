# FreedomGuard → Platform Data Migration

`scripts/migrate-fg.ts` — operator-run one-shot migration tool.

## Quick Start

```bash
# Dry-run (default — prints counts, writes NOTHING):
FG_DATABASE_URL="postgresql://freedom_guard:fg_s3cur3_p4ss@localhost:5433/freedom_guard" \
  pnpm migrate:fg --dry --tenant freedomguards

# Apply (writes to platform DB; operator's call):
FG_DATABASE_URL="postgresql://..." \
  pnpm migrate:fg --apply --tenant freedomguards
```

`--dry` is the default if neither `--dry` nor `--apply` is given.

---

## Entity Mapping Table

| FG Model (table) | Platform Model (table) | Notes |
|---|---|---|
| `User` (`users`) | `Account` (`accounts`) + `Membership` (`memberships`) | See "Members" below |
| `ForumCategory` (`forum_categories`) | `ForumCategory` (`forum_categories`) | 1-1 field map |
| `ForumThread` (`forum_threads`) | `ForumThread` (`forum_threads`) | authorId → authorMembershipId |
| `ForumPost` (`forum_posts`) | `ForumPost` (`forum_posts`) | authorId → authorMembershipId |
| `LootMember` (`loot_members`) | `LootMember` (`loot_members`) | userId → membershipId |
| `LootSession` (`loot_sessions`) | `LootSession` (`loot_sessions`) | createdById → createdByMembershipId |
| `LootAttendance` (`loot_attendance`) | `LootAttendance` (`loot_attendance`) | 1-1 status map |
| `LootTransaction` (`loot_transactions`) | `LootTransaction` (`loot_transactions`) | Decimal → amountTenths (×10, rounded) |
| `FleetShip` (`fleet_ships`) | `FleetShip` (`fleet_ships`) | userId → ownerMembershipId |
| `TreasuryEntry` (`treasury_entries`) | `TreasuryEntry` (`treasury_entries`) | createdById → authorMembershipId |

---

## Members: FG User → Account + Membership

FG has a global `User` model (NextAuth). The platform separates global identity
(`Account`) from per-tenant context (`Membership`).

**Step 1 — Account (global):** Upserted by `email`. If FG user has no email, a
synthetic placeholder `<username>@fg-migrated.invalid` is used and will need
manual review.

**Step 2 — Membership (tenant-scoped):** Created with `[tenantId, username]` as
the natural key. Re-runs skip existing memberships.

### Rank → Tier Heuristic

FG stores ranks in `user_ranks JOIN ranks`. The tool reads each user's most
recently promoted rank (`ORDER BY promoted_at DESC LIMIT 1`) and maps:

| FG `ranks.tier` (RankTier) | Platform `membership.tier` (RankTier) |
|---|---|
| `ENLISTED` | `ENLISTED` |
| `NCO` | `NCO` |
| `OFFICER` | `OFFICER` |
| `COMMAND` | `COMMAND` |

The enums are identical; mapping is 1-1. Users with **no rank record** default
to `ENLISTED`.

---

## Loot: Amount Conversion

FG `LootTransaction.amount` is `Decimal(6,1)` (e.g. `3.5`).
Platform `LootTransaction.amountTenths` is `Int` (tenths of a point).

Conversion: `amountTenths = Math.round(parseFloat(amount) * 10)`

Example: `3.5` → `35`, `10.0` → `100`.

---

## Treasury Enum Heuristics

Both FG and the platform define identical `TreasuryType` and `TreasuryCategory`
enums:

**TreasuryType:** `INCOME | EXPENSE` — 1-1 match. Unknown values → `INCOME` +
console warning.

**TreasuryCategory:**
`MINING | TRADING | BOUNTY | SALVAGE | DONATION | PURCHASE | PAYOUT | EVENT | OTHER`
— 1-1 match. Unknown values → `OTHER` + console warning.

No lossy mapping is expected; both schemas were written together.

---

## Unmapped Author Handling

When a forum thread, forum post, loot session, loot transaction, fleet ship, or
treasury entry references a FG user ID that was **not successfully migrated** to
a platform membership:

- The record is **skipped** (not migrated).
- A `[WARN]` line is printed with the FG entity ID and the unmapped user ID.
- The skip count appears in the summary under `Skip(unmap)`.

**Rationale:** These entities require a valid `authorMembershipId` /
`ownerMembershipId` — creating orphaned rows would violate FK constraints and
confuse the platform UX.

---

## FG Models NOT Migrated

The following FG models have no counterpart in the current platform schema and
are **explicitly not migrated**:

| FG Model | Reason |
|---|---|
| `Conversation`, `ConversationParticipant`, `Message` | DMs — no platform DM feature |
| `Event`, `EventRsvp`, `EventComment`, `EventTypeConfig` | Events — not in platform |
| `NewsArticle`, `NewsComment` | News — not in platform |
| `Operation`, `OperationSignup`, `OperationSlot`, `OperationComment` | Operations — not in platform |
| `AwardType`, `UserAward` | Awards — not in platform |
| `MediaItem`, `MediaComment` | Media gallery — not in platform |
| `Application` | Member applications — not in platform |
| `Resource` | Guides/resources — not in platform |
| `AuditLog` | Different schema; migration audit would be noisy |
| `Notification` | User-session-bound; not portable |
| `SiteSetting` | Tenant-specific config; set manually |
| `MemberAvailability`, `ShipLoadout` | Not in platform |
| `Team`, `TeamMember`, `Board`, `BoardColumn`, `BoardLabel`, `Ticket`, `TicketLabel`, `TicketComment`, `TicketActivity` | Ticket/project system — not in platform |
| `LfgPost`, `LfgResponse` | LFG — not in platform |
| `Contract` | Job board — not in platform |
| `Alliance` | Diplomacy — not in platform |
| `ReputationEvent` | Reputation — not in platform |
| `CargoManifest`, `CargoItem` | Logistics — not in platform |
| `Squad`, `SquadMember` | Squads — not in platform |
| `OrgItemCatalog`, `OrgItemInstance`, `OrgItemEvent`, `OrgItemLoan`, `PersonalOrgItemEntry`, `OrgItemRequest` | Inventory system — platform has its own `InventoryItem`/`InventoryHolding` schema; mapping is non-trivial and deferred |
| `Handbook`, `HandbookSection`, `SignOffCategory`, `SignOffItem`, `SignOffSignature`, `HandbookAcknowledgement` | Platform has its own handbook schema; mapping deferred (similar but not identical) |
| `Rank`, `UserRank` | Used only to derive `membership.tier`; rank history is not migrated |
| `Account` (FG NextAuth) | OAuth tokens are not portable |
| `Session`, `VerificationToken` | Auth session state — not portable |

---

## Idempotency

Re-running `--apply` is safe:

- **Account:** upserted by `email` (update displayName/avatarUrl only).
- **Membership:** skip-if-exists by `[tenantId, username]`.
- **ForumCategory:** upserted by `[tenantId, slug]`.
- **ForumThread:** skip-if-exists by `(tenantId, categoryId, title, createdAt)`.
- **ForumPost:** skip-if-exists by `(tenantId, threadId, createdAt)`.
- **LootMember:** skip-if-exists by `[tenantId, membershipId]` (linked) or `(tenantId, displayName, membershipId=null)` (unlinked).
- **LootSession:** skip-if-exists by `(tenantId, label, sessionDate)`.
- **LootAttendance:** upserted by `[sessionId, memberId]`.
- **LootTransaction:** skip-if-exists by `(tenantId, memberId, amountTenths, createdAt)`.
- **FleetShip:** skip-if-exists by `(tenantId, ownerMembershipId, shipName)`.
- **TreasuryEntry:** skip-if-exists by `(tenantId, authorMembershipId, amount, createdAt)`.

---

## SOURCE Connection

The tool resolves `FG_DATABASE_URL` in this priority order:

1. `FG_DATABASE_URL` environment variable (recommended for prod).
2. `DATABASE_URL` from `../FreedomGuard/.env` (for local dev convenience).

The FG client is **read-only by design** — only `$queryRawUnsafe` SELECT
statements are issued against it. Nothing is written to the FG database.

---

## PROD RUN CHECKLIST

**Before running on production:**

1. Back up the platform production database.
   ```bash
   pg_dump $PLATFORM_PROD_URL > platform-backup-$(date +%Y%m%d-%H%M%S).sql
   ```

2. Obtain a read-only FG production connection string from the FG operator.
   Do NOT use the FG production write URL; the script enforces read-only
   access via SELECT-only queries, but belt-and-suspenders: use a read replica
   or read-only user.

3. Run the dry-run against production target first:
   ```bash
   FG_DATABASE_URL="postgresql://readonly_user:pass@fg-prod-host:5432/freedom_guard" \
     NODE_ENV=production \
     pnpm migrate:fg --dry --tenant freedomguards
   ```

4. Review the output. Specifically check:
   - `Skip(unmap)` counts — users whose authored content will be skipped.
   - Any `[WARN]` lines about unknown enum values.
   - Total counts match expectations from FG admin panel.

5. When satisfied, run with `--apply`:
   ```bash
   FG_DATABASE_URL="postgresql://readonly_user:pass@fg-prod-host:5432/freedom_guard" \
     NODE_ENV=production \
     pnpm migrate:fg --apply --tenant freedomguards
   ```

6. Review the applied summary. Check for any `Failed` rows and investigate.

7. Re-run `--dry` to confirm `Skip(exist)` counts equal the previous
   `Migrated` counts (proves full idempotency).

8. Manually verify spot-checks in the platform UI:
   - A known FG user appears in the freedomguards member list with correct tier.
   - Forum categories and threads are visible.
   - Loot sessions and balances look correct.
   - Fleet ships appear on the correct member's profile.
   - Treasury entries have correct amounts and categories.
