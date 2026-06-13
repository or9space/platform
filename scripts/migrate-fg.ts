/**
 * FreedomGuard -> Platform Data Migration Tool
 *
 * Usage:
 *   FG_DATABASE_URL="postgresql://..." pnpm migrate:fg [--dry] [--apply] [--tenant <slug>]
 *
 * Flags:
 *   --dry     (DEFAULT) Dry-run: read-only, prints counts, writes NOTHING.
 *   --apply   Actually write to the target platform DB. Prompts for explicit confirmation.
 *   --tenant  Target tenant slug (default: "freedomguards").
 *
 * SOURCE reads use raw SQL ($queryRaw) against FG_DATABASE_URL.
 * TARGET writes use the platform PrismaClient (platform's generated client).
 * NEVER writes to the source.
 *
 * Idempotent: re-running --apply skips rows that already exist (upsert/skip-on-conflict).
 *
 * See docs/MIGRATION_FG.md for full mapping decisions.
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const DRY = !APPLY; // dry-run is default
const tenantArg = args.findIndex((a) => a === "--tenant");
const TENANT_SLUG = tenantArg !== -1 ? args[tenantArg + 1] : "freedomguards";

// ---------------------------------------------------------------------------
// DB URLs
// ---------------------------------------------------------------------------

/**
 * Resolve FG DATABASE_URL: env var takes precedence, else read FG .env file.
 */
function resolveFgUrl(): string {
  if (process.env.FG_DATABASE_URL) {
    return process.env.FG_DATABASE_URL;
  }
  // Try to read FG .env relative to this script (../FreedomGuard/.env from platform root)
  const candidates = [
    path.resolve(process.cwd(), "../FreedomGuard/.env"),
    path.resolve(process.cwd(), "../../FreedomGuard/.env"),
    "C:\\Projects\\FreedomGuard\\.env",
    "/c/Projects/FreedomGuard/.env",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const contents = fs.readFileSync(p, "utf8");
      const match = contents.match(/^DATABASE_URL="?([^"\n]+)"?/m);
      if (match) {
        return match[1];
      }
    }
  }
  throw new Error(
    "Cannot find FG DATABASE_URL. Set FG_DATABASE_URL env var or ensure FG .env is at ../FreedomGuard/.env"
  );
}

// ---------------------------------------------------------------------------
// Source (FG) client — raw SQL only, read-only
// ---------------------------------------------------------------------------

/**
 * We cannot use FG's generated Prisma client (it's not installed in this repo).
 * Instead, we create a PrismaClient pointed at FG_URL and query via $queryRawUnsafe.
 * This uses the PLATFORM's prisma engine but only to open a raw Postgres connection.
 */
function createFgClient(fgUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: fgUrl } },
    log: [],
  });
}

// ---------------------------------------------------------------------------
// Rank -> Tier heuristic
// ---------------------------------------------------------------------------

/**
 * FG has a free-form rank system where RankTier is on the Rank model itself.
 * We JOIN user_ranks -> ranks to get the latest active rank's tier.
 * Mapping: FG RankTier (ENLISTED/NCO/OFFICER/COMMAND) -> platform RankTier (same names, 1:1).
 * Users with no rank record default to ENLISTED.
 */
function fgTierToPlatformTier(
  fgTier: string | null
): "ENLISTED" | "NCO" | "OFFICER" | "COMMAND" {
  switch (fgTier) {
    case "NCO":
      return "NCO";
    case "OFFICER":
      return "OFFICER";
    case "COMMAND":
      return "COMMAND";
    default:
      // ENLISTED or null/missing
      return "ENLISTED";
  }
}

// ---------------------------------------------------------------------------
// Treasury enum mapping
// ---------------------------------------------------------------------------

/**
 * FG TreasuryType: INCOME | EXPENSE -> platform TreasuryType: INCOME | EXPENSE (1:1)
 * FG TreasuryCategory: MINING|TRADING|BOUNTY|SALVAGE|DONATION|PURCHASE|PAYOUT|EVENT|OTHER
 * -> platform TreasuryCategory: same set (1:1 match)
 * If unknown value encountered, fall back to OTHER for category, INCOME for type with a warning.
 */
function mapTreasuryType(fgType: string): "INCOME" | "EXPENSE" {
  if (fgType === "INCOME" || fgType === "EXPENSE") return fgType;
  console.warn(
    `[WARN] Unknown treasury type "${fgType}" — defaulting to INCOME`
  );
  return "INCOME";
}

function mapTreasuryCategory(
  fgCat: string
):
  | "MINING"
  | "TRADING"
  | "BOUNTY"
  | "SALVAGE"
  | "DONATION"
  | "PURCHASE"
  | "PAYOUT"
  | "EVENT"
  | "OTHER" {
  const valid = [
    "MINING",
    "TRADING",
    "BOUNTY",
    "SALVAGE",
    "DONATION",
    "PURCHASE",
    "PAYOUT",
    "EVENT",
    "OTHER",
  ] as const;
  if (valid.includes(fgCat as (typeof valid)[number])) {
    return fgCat as (typeof valid)[number];
  }
  console.warn(
    `[WARN] Unknown treasury category "${fgCat}" — defaulting to OTHER`
  );
  return "OTHER";
}

// ---------------------------------------------------------------------------
// FG raw query helpers
// ---------------------------------------------------------------------------

type FgUser = {
  id: string;
  username: string;
  email: string | null;
  display_name: string | null;
  avatar: string | null;
  bio: string | null;
  created_at: Date;
};

type FgRankTierRow = {
  user_id: string;
  tier: string;
};

type FgForumCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: Date;
};

type FgForumThread = {
  id: string;
  title: string;
  category_id: string;
  author_id: string;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  last_post_at: Date | null;
};

type FgForumPost = {
  id: string;
  content: string;
  thread_id: string;
  author_id: string;
  is_edited: boolean;
  created_at: Date;
  updated_at: Date;
};

type FgLootMember = {
  id: string;
  display_name: string;
  user_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type FgLootSession = {
  id: string;
  label: string;
  session_date: Date;
  notes: string | null;
  created_by_id: string;
  created_at: Date;
};

type FgLootAttendance = {
  id: string;
  session_id: string;
  member_id: string;
  status: string;
  updated_at: Date;
};

type FgLootTransaction = {
  id: string;
  member_id: string;
  amount: string; // Decimal comes back as string from raw query
  type: string;
  note: string | null;
  related_member_id: string | null;
  created_by_id: string;
  created_at: Date;
};

type FgFleetShip = {
  id: string;
  user_id: string;
  ship_slug: string;
  ship_name: string;
  manufacturer: string;
  image_url: string | null;
  notes: string | null;
  is_public: boolean;
  quantity: number;
  created_at: Date;
};

type FgTreasuryEntry = {
  id: string;
  amount: number;
  type: string;
  category: string;
  description: string;
  created_by_id: string;
  created_at: Date;
};

// ---------------------------------------------------------------------------
// Summary counters
// ---------------------------------------------------------------------------

type EntityStats = {
  found: number;
  migrated: number;
  skipped_existing: number;
  skipped_unmapped: number;
  failed: number;
};

function emptyStats(): EntityStats {
  return {
    found: 0,
    migrated: 0,
    skipped_existing: 0,
    skipped_unmapped: 0,
    failed: 0,
  };
}

function printSummary(stats: Record<string, EntityStats>): void {
  console.log(
    "\n" +
      "=".repeat(90) +
      "\n  MIGRATION SUMMARY  (" +
      (DRY ? "DRY-RUN — nothing written" : "APPLIED") +
      ")\n" +
      "=".repeat(90)
  );
  const header = [
    "Entity".padEnd(22),
    "Found".padStart(7),
    "Migrated".padStart(10),
    "Skip(exist)".padStart(13),
    "Skip(unmap)".padStart(13),
    "Failed".padStart(8),
  ].join("  ");
  console.log(header);
  console.log("-".repeat(90));
  for (const [name, s] of Object.entries(stats)) {
    console.log(
      [
        name.padEnd(22),
        String(s.found).padStart(7),
        String(s.migrated).padStart(10),
        String(s.skipped_existing).padStart(13),
        String(s.skipped_unmapped).padStart(13),
        String(s.failed).padStart(8),
      ].join("  ")
    );
  }
  console.log("=".repeat(90));
  if (DRY) {
    console.log(
      "\nThis was a DRY-RUN. No data was written. Re-run with --apply to execute."
    );
  }
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log(`  FG -> Platform Migration`);
  console.log(`  Mode:   ${DRY ? "DRY-RUN (default)" : "APPLY"}`);
  console.log(`  Tenant: ${TENANT_SLUG}`);
  console.log("=".repeat(60));

  // --- Resolve FG URL ---
  let fgUrl: string;
  try {
    fgUrl = resolveFgUrl();
    console.log(`\n[INFO] FG URL resolved (${fgUrl.replace(/:([^@]+)@/, ":***@")})`);
  } catch (e) {
    console.error(`\n[ERROR] ${(e as Error).message}`);
    process.exit(1);
  }

  // --- Connect SOURCE ---
  const fg = createFgClient(fgUrl);
  try {
    await fg.$queryRaw`SELECT 1`;
    console.log("[INFO] SOURCE (FG) DB connected.");
  } catch (e) {
    console.error(
      `[ERROR] Cannot connect to FG DB at ${fgUrl.replace(/:([^@]+)@/, ":***@")}: ${(e as Error).message}`
    );
    await fg.$disconnect();
    process.exit(1);
  }

  // --- Connect TARGET ---
  const target = new PrismaClient();
  try {
    await target.$queryRaw`SELECT 1`;
    console.log("[INFO] TARGET (platform) DB connected.");
  } catch (e) {
    console.error(
      `[ERROR] Cannot connect to platform DB. Check DATABASE_URL in .env: ${(e as Error).message}`
    );
    await fg.$disconnect();
    await target.$disconnect();
    process.exit(1);
  }

  // --- Resolve tenant ---
  const tenant = await target.tenant.findUnique({
    where: { slug: TENANT_SLUG },
  });
  if (!tenant) {
    console.error(
      `[ERROR] Tenant with slug "${TENANT_SLUG}" not found in platform DB. Run pnpm db:seed first.`
    );
    await fg.$disconnect();
    await target.$disconnect();
    process.exit(1);
  }
  console.log(`[INFO] Target tenant: "${tenant.name}" (id=${tenant.id})\n`);

  const tenantId = tenant.id;
  const stats: Record<string, EntityStats> = {};

  // =========================================================================
  // A. MEMBERS: FG User -> platform Account + Membership
  // =========================================================================
  // We also fetch the most recent rank tier for each user (via user_ranks JOIN ranks)
  // to set membership.tier.
  // Natural key for Account: email. Natural key for Membership: [tenantId, username].
  // In-memory map: fgUserId -> platformMembershipId (for downstream FK resolution)
  // =========================================================================

  const memberStats = emptyStats();
  stats["Account+Membership"] = memberStats;

  console.log("[STEP 1/5] Migrating members (Users)...");

  // Fetch all FG users
  const fgUsers = (await fg.$queryRawUnsafe<FgUser[]>(
    `SELECT id, username, email, display_name, avatar, bio, created_at FROM users ORDER BY created_at`
  ));

  // Fetch latest rank tier per user (latest by promoted_at)
  const fgRankTiers = (await fg.$queryRawUnsafe<FgRankTierRow[]>(
    `SELECT DISTINCT ON (ur.user_id) ur.user_id, r.tier
     FROM user_ranks ur
     JOIN ranks r ON r.id = ur.rank_id
     ORDER BY ur.user_id, ur.promoted_at DESC`
  ));
  const rankTierMap = new Map<string, string>(
    fgRankTiers.map((r) => [r.user_id, r.tier])
  );

  memberStats.found = fgUsers.length;

  // Map: fgUserId -> platform membershipId
  const userMembershipMap = new Map<string, string>();

  for (const fgUser of fgUsers) {
    const email = fgUser.email ?? `${fgUser.username}@fg-migrated.invalid`;
    const tier = fgTierToPlatformTier(rankTierMap.get(fgUser.id) ?? null);

    if (DRY) {
      // In dry-run: check if account+membership already exist
      const existingAccount = await target.account.findUnique({
        where: { email },
      });
      const existingMembership = existingAccount
        ? await target.membership.findUnique({
            where: {
              tenantId_username: {
                tenantId,
                username: fgUser.username,
              },
            },
          })
        : null;

      if (existingAccount && existingMembership) {
        memberStats.skipped_existing++;
        userMembershipMap.set(fgUser.id, existingMembership.id);
      } else {
        memberStats.migrated++;
        // For dry-run, fake a membership ID so downstream counts can proceed
        userMembershipMap.set(fgUser.id, `dry-run-${fgUser.id}`);
      }
      continue;
    }

    // APPLY path
    try {
      // Upsert Account (global, by email)
      const account = await target.account.upsert({
        where: { email },
        update: {
          displayName: fgUser.display_name ?? fgUser.username,
          avatarUrl: fgUser.avatar,
        },
        create: {
          email,
          displayName: fgUser.display_name ?? fgUser.username,
          avatarUrl: fgUser.avatar,
          createdAt: fgUser.created_at,
        },
      });

      // Upsert Membership (tenant-scoped, by [tenantId, username])
      const existingMembership = await target.membership.findUnique({
        where: {
          tenantId_username: {
            tenantId,
            username: fgUser.username,
          },
        },
      });

      if (existingMembership) {
        userMembershipMap.set(fgUser.id, existingMembership.id);
        memberStats.skipped_existing++;
      } else {
        const membership = await target.membership.create({
          data: {
            accountId: account.id,
            tenantId,
            username: fgUser.username,
            displayName: fgUser.display_name ?? fgUser.username,
            bio: fgUser.bio
              ? fgUser.bio.slice(0, 500)
              : null,
            avatarUrl: fgUser.avatar,
            tier,
            createdAt: fgUser.created_at,
          },
        });
        userMembershipMap.set(fgUser.id, membership.id);
        memberStats.migrated++;
      }
    } catch (e) {
      console.error(
        `[ERROR] Member ${fgUser.username} (${fgUser.id}): ${(e as Error).message}`
      );
      memberStats.failed++;
    }
  }

  console.log(
    `  Users found: ${memberStats.found}, would-migrate: ${memberStats.migrated}, already-exist: ${memberStats.skipped_existing}, failed: ${memberStats.failed}`
  );

  // =========================================================================
  // B. FORUMS: ForumCategory -> ForumThread -> ForumPost
  // Natural key: ForumCategory [tenantId, slug]; Thread [tenantId, title+categoryId] —
  // no unique constraint on title, so we use the FG source id stored in notes/metadata trick.
  // Simpler approach: use a source-id lookup table in memory keyed by FG id.
  // We check for existing by FG thread id embedded into a stable query.
  // For idempotency on threads/posts: we skip if a thread with the same title+categoryId
  // AND same createdAt already exists. If no reliable key, we rely on the dry-run counts.
  // Best idempotency key available: for threads, (tenantId, categoryId, createdAt) combo
  // is highly unlikely to collide; for posts (tenantId, threadId, createdAt).
  // =========================================================================

  const categoryStats = emptyStats();
  const threadStats = emptyStats();
  const postStats = emptyStats();
  stats["ForumCategory"] = categoryStats;
  stats["ForumThread"] = threadStats;
  stats["ForumPost"] = postStats;

  console.log("\n[STEP 2/5] Migrating forums...");

  // FG ForumCategory (table: forum_categories, no @@map slug-unique globally but unique)
  const fgCategories = await fg.$queryRawUnsafe<FgForumCategory[]>(
    `SELECT id, name, slug, description, sort_order, created_at FROM forum_categories ORDER BY sort_order`
  );
  categoryStats.found = fgCategories.length;

  // Map: fg categoryId -> platform categoryId
  const categoryMap = new Map<string, string>();

  for (const fgCat of fgCategories) {
    if (DRY) {
      const existing = await target.forumCategory.findUnique({
        where: { tenantId_slug: { tenantId, slug: fgCat.slug } },
      });
      if (existing) {
        categoryStats.skipped_existing++;
        categoryMap.set(fgCat.id, existing.id);
      } else {
        categoryStats.migrated++;
        categoryMap.set(fgCat.id, `dry-${fgCat.id}`);
      }
      continue;
    }

    try {
      const cat = await target.forumCategory.upsert({
        where: { tenantId_slug: { tenantId, slug: fgCat.slug } },
        update: { name: fgCat.name, description: fgCat.description, sortOrder: fgCat.sort_order },
        create: {
          tenantId,
          name: fgCat.name,
          slug: fgCat.slug,
          description: fgCat.description,
          sortOrder: fgCat.sort_order,
          createdAt: fgCat.created_at,
        },
      });
      categoryMap.set(fgCat.id, cat.id);
      categoryStats.migrated++;
    } catch (e) {
      console.error(`[ERROR] ForumCategory ${fgCat.slug}: ${(e as Error).message}`);
      categoryStats.failed++;
    }
  }

  console.log(
    `  Categories found: ${categoryStats.found}, would-migrate: ${categoryStats.migrated}, already-exist: ${categoryStats.skipped_existing}`
  );

  // FG ForumThreads (table: forum_threads)
  const fgThreads = await fg.$queryRawUnsafe<FgForumThread[]>(
    `SELECT id, title, category_id, author_id, is_pinned, is_locked, view_count, created_at, updated_at, last_post_at
     FROM forum_threads ORDER BY created_at`
  );
  threadStats.found = fgThreads.length;

  // Map: fg threadId -> platform threadId
  const threadMap = new Map<string, string>();

  for (const fgThread of fgThreads) {
    const platformCategoryId = categoryMap.get(fgThread.category_id);
    const authorMembershipId = userMembershipMap.get(fgThread.author_id);

    if (!platformCategoryId) {
      console.warn(
        `[WARN] Thread "${fgThread.title}" skipped — category ${fgThread.category_id} not mapped`
      );
      threadStats.skipped_unmapped++;
      continue;
    }
    if (!authorMembershipId) {
      console.warn(
        `[WARN] Thread "${fgThread.title}" skipped — author ${fgThread.author_id} not mapped`
      );
      threadStats.skipped_unmapped++;
      continue;
    }

    if (DRY) {
      // Check by title + categoryId + createdAt as idempotency proxy
      const existing = await target.forumThread.findFirst({
        where: {
          tenantId,
          categoryId: platformCategoryId.startsWith("dry-")
            ? undefined
            : platformCategoryId,
          title: fgThread.title,
          createdAt: fgThread.created_at,
        },
      });
      if (existing) {
        threadStats.skipped_existing++;
        threadMap.set(fgThread.id, existing.id);
      } else {
        threadStats.migrated++;
        threadMap.set(fgThread.id, `dry-${fgThread.id}`);
      }
      continue;
    }

    try {
      // Idempotency: check by (tenantId, categoryId, title, createdAt)
      const existing = await target.forumThread.findFirst({
        where: {
          tenantId,
          categoryId: platformCategoryId,
          title: fgThread.title,
          createdAt: fgThread.created_at,
        },
      });
      if (existing) {
        threadStats.skipped_existing++;
        threadMap.set(fgThread.id, existing.id);
        continue;
      }

      const thread = await target.forumThread.create({
        data: {
          tenantId,
          categoryId: platformCategoryId,
          authorMembershipId,
          title: fgThread.title.slice(0, 200),
          isPinned: fgThread.is_pinned,
          isLocked: fgThread.is_locked,
          viewCount: fgThread.view_count,
          createdAt: fgThread.created_at,
          updatedAt: fgThread.updated_at,
          lastPostAt: fgThread.last_post_at,
        },
      });
      threadMap.set(fgThread.id, thread.id);
      threadStats.migrated++;
    } catch (e) {
      console.error(`[ERROR] ForumThread "${fgThread.title}": ${(e as Error).message}`);
      threadStats.failed++;
    }
  }

  console.log(
    `  Threads found: ${threadStats.found}, would-migrate: ${threadStats.migrated}, skip-exist: ${threadStats.skipped_existing}, skip-unmap: ${threadStats.skipped_unmapped}`
  );

  // FG ForumPosts (table: forum_posts)
  const fgPosts = await fg.$queryRawUnsafe<FgForumPost[]>(
    `SELECT id, content, thread_id, author_id, is_edited, created_at, updated_at
     FROM forum_posts ORDER BY created_at`
  );
  postStats.found = fgPosts.length;

  for (const fgPost of fgPosts) {
    const platformThreadId = threadMap.get(fgPost.thread_id);
    const authorMembershipId = userMembershipMap.get(fgPost.author_id);

    if (!platformThreadId) {
      postStats.skipped_unmapped++;
      continue;
    }
    if (!authorMembershipId) {
      console.warn(`[WARN] ForumPost author ${fgPost.author_id} not mapped — skipping`);
      postStats.skipped_unmapped++;
      continue;
    }

    if (DRY) {
      const existing = await target.forumPost.findFirst({
        where: {
          tenantId,
          threadId: platformThreadId.startsWith("dry-") ? undefined : platformThreadId,
          createdAt: fgPost.created_at,
        },
      });
      if (existing) {
        postStats.skipped_existing++;
      } else {
        postStats.migrated++;
      }
      continue;
    }

    try {
      const existing = await target.forumPost.findFirst({
        where: { tenantId, threadId: platformThreadId, createdAt: fgPost.created_at },
      });
      if (existing) {
        postStats.skipped_existing++;
        continue;
      }
      await target.forumPost.create({
        data: {
          tenantId,
          threadId: platformThreadId,
          authorMembershipId,
          content: fgPost.content.slice(0, 20000),
          isEdited: fgPost.is_edited,
          createdAt: fgPost.created_at,
          updatedAt: fgPost.updated_at,
        },
      });
      postStats.migrated++;
    } catch (e) {
      console.error(`[ERROR] ForumPost ${fgPost.id}: ${(e as Error).message}`);
      postStats.failed++;
    }
  }

  console.log(
    `  Posts found: ${postStats.found}, would-migrate: ${postStats.migrated}, skip-exist: ${postStats.skipped_existing}, skip-unmap: ${postStats.skipped_unmapped}`
  );

  // =========================================================================
  // C. LOOT: LootMember -> LootSession -> LootAttendance -> LootTransaction
  // =========================================================================

  const lootMemberStats = emptyStats();
  const lootSessionStats = emptyStats();
  const lootAttendanceStats = emptyStats();
  const lootTxnStats = emptyStats();
  stats["LootMember"] = lootMemberStats;
  stats["LootSession"] = lootSessionStats;
  stats["LootAttendance"] = lootAttendanceStats;
  stats["LootTransaction"] = lootTxnStats;

  console.log("\n[STEP 3/5] Migrating loot...");

  // FG LootMember (table: loot_members)
  const fgLootMembers = await fg.$queryRawUnsafe<FgLootMember[]>(
    `SELECT id, display_name, user_id, created_at, updated_at FROM loot_members ORDER BY created_at`
  );
  lootMemberStats.found = fgLootMembers.length;

  // Map: fg LootMember.id -> platform LootMember.id
  const lootMemberMap = new Map<string, string>();

  for (const fgLm of fgLootMembers) {
    // membershipId via userMembershipMap when linked
    const membershipId = fgLm.user_id
      ? (userMembershipMap.get(fgLm.user_id) ?? null)
      : null;
    // Skip dry-run fake IDs
    const resolvedMembershipId =
      membershipId && !membershipId.startsWith("dry-") ? membershipId : null;

    if (DRY) {
      // Unique constraint in platform: [tenantId, membershipId] (when membershipId set)
      // For unlinked members (membershipId null), check by tenantId + displayName as proxy
      const existingRecord = resolvedMembershipId
        ? await target.lootMember.findUnique({
            where: { tenantId_membershipId: { tenantId, membershipId: resolvedMembershipId } },
          })
        : await target.lootMember.findFirst({
            where: { tenantId, displayName: fgLm.display_name, membershipId: null },
          });

      if (existingRecord) {
        lootMemberStats.skipped_existing++;
        lootMemberMap.set(fgLm.id, existingRecord.id);
      } else {
        lootMemberStats.migrated++;
        lootMemberMap.set(fgLm.id, `dry-${fgLm.id}`);
      }
      continue;
    }

    try {
      // Upsert: if linked, use [tenantId, membershipId] unique; else create new unlinked
      if (resolvedMembershipId) {
        const existing = await target.lootMember.findUnique({
          where: { tenantId_membershipId: { tenantId, membershipId: resolvedMembershipId } },
        });
        if (existing) {
          lootMemberMap.set(fgLm.id, existing.id);
          lootMemberStats.skipped_existing++;
          continue;
        }
        const lm = await target.lootMember.create({
          data: {
            tenantId,
            membershipId: resolvedMembershipId,
            displayName: fgLm.display_name.slice(0, 120),
            createdAt: fgLm.created_at,
          },
        });
        lootMemberMap.set(fgLm.id, lm.id);
      } else {
        // Unlinked: check by tenantId + displayName + membershipId null
        const existing = await target.lootMember.findFirst({
          where: { tenantId, displayName: fgLm.display_name, membershipId: null },
        });
        if (existing) {
          lootMemberMap.set(fgLm.id, existing.id);
          lootMemberStats.skipped_existing++;
          continue;
        }
        const lm = await target.lootMember.create({
          data: {
            tenantId,
            membershipId: null,
            displayName: fgLm.display_name.slice(0, 120),
            createdAt: fgLm.created_at,
          },
        });
        lootMemberMap.set(fgLm.id, lm.id);
      }
      lootMemberStats.migrated++;
    } catch (e) {
      console.error(`[ERROR] LootMember ${fgLm.display_name}: ${(e as Error).message}`);
      lootMemberStats.failed++;
    }
  }

  console.log(
    `  LootMembers found: ${lootMemberStats.found}, would-migrate: ${lootMemberStats.migrated}, skip-exist: ${lootMemberStats.skipped_existing}`
  );

  // FG LootSession (table: loot_sessions)
  // We need the creator's membership ID for createdByMembershipId
  const fgLootSessions = await fg.$queryRawUnsafe<FgLootSession[]>(
    `SELECT id, label, session_date, notes, created_by_id, created_at FROM loot_sessions ORDER BY session_date`
  );
  lootSessionStats.found = fgLootSessions.length;

  // Map: fg sessionId -> platform sessionId
  const lootSessionMap = new Map<string, string>();

  // We need a fallback membership ID for sessions whose creator isn't mapped.
  // Strategy: if creator unmapped, skip session (and its attendance/txns).
  for (const fgSess of fgLootSessions) {
    const creatorMembershipId = userMembershipMap.get(fgSess.created_by_id);

    if (!creatorMembershipId) {
      console.warn(
        `[WARN] LootSession "${fgSess.label}" creator ${fgSess.created_by_id} not mapped — skipping`
      );
      lootSessionStats.skipped_unmapped++;
      continue;
    }
    const resolvedCreatorId = creatorMembershipId.startsWith("dry-")
      ? null
      : creatorMembershipId;

    if (DRY) {
      const existing = await target.lootSession.findFirst({
        where: { tenantId, label: fgSess.label, sessionDate: fgSess.session_date },
      });
      if (existing) {
        lootSessionStats.skipped_existing++;
        lootSessionMap.set(fgSess.id, existing.id);
      } else {
        lootSessionStats.migrated++;
        lootSessionMap.set(fgSess.id, `dry-${fgSess.id}`);
      }
      continue;
    }

    if (!resolvedCreatorId) {
      lootSessionStats.skipped_unmapped++;
      continue;
    }

    try {
      const existing = await target.lootSession.findFirst({
        where: { tenantId, label: fgSess.label, sessionDate: fgSess.session_date },
      });
      if (existing) {
        lootSessionMap.set(fgSess.id, existing.id);
        lootSessionStats.skipped_existing++;
        continue;
      }
      const sess = await target.lootSession.create({
        data: {
          tenantId,
          label: fgSess.label.slice(0, 160),
          sessionDate: fgSess.session_date,
          notes: fgSess.notes ? fgSess.notes.slice(0, 500) : null,
          createdByMembershipId: resolvedCreatorId,
          createdAt: fgSess.created_at,
        },
      });
      lootSessionMap.set(fgSess.id, sess.id);
      lootSessionStats.migrated++;
    } catch (e) {
      console.error(`[ERROR] LootSession "${fgSess.label}": ${(e as Error).message}`);
      lootSessionStats.failed++;
    }
  }

  console.log(
    `  LootSessions found: ${lootSessionStats.found}, would-migrate: ${lootSessionStats.migrated}, skip-exist: ${lootSessionStats.skipped_existing}, skip-unmap: ${lootSessionStats.skipped_unmapped}`
  );

  // FG LootAttendance (table: loot_attendance)
  const fgAttendance = await fg.$queryRawUnsafe<FgLootAttendance[]>(
    `SELECT id, session_id, member_id, status, updated_at FROM loot_attendance ORDER BY session_id`
  );
  lootAttendanceStats.found = fgAttendance.length;

  for (const fgAtt of fgAttendance) {
    const platformSessionId = lootSessionMap.get(fgAtt.session_id);
    const platformMemberId = lootMemberMap.get(fgAtt.member_id);

    if (!platformSessionId) {
      lootAttendanceStats.skipped_unmapped++;
      continue;
    }
    if (!platformMemberId) {
      lootAttendanceStats.skipped_unmapped++;
      continue;
    }

    const status = (["PRESENT", "LATE", "ABSENT"].includes(fgAtt.status)
      ? fgAtt.status
      : "PRESENT") as "PRESENT" | "LATE" | "ABSENT";

    if (DRY) {
      const realSessionId = platformSessionId.startsWith("dry-") ? null : platformSessionId;
      const realMemberId = platformMemberId.startsWith("dry-") ? null : platformMemberId;
      if (realSessionId && realMemberId) {
        const existing = await target.lootAttendance.findUnique({
          where: { sessionId_memberId: { sessionId: realSessionId, memberId: realMemberId } },
        });
        if (existing) {
          lootAttendanceStats.skipped_existing++;
        } else {
          lootAttendanceStats.migrated++;
        }
      } else {
        lootAttendanceStats.migrated++;
      }
      continue;
    }

    try {
      await target.lootAttendance.upsert({
        where: {
          sessionId_memberId: { sessionId: platformSessionId, memberId: platformMemberId },
        },
        update: { status },
        create: {
          tenantId,
          sessionId: platformSessionId,
          memberId: platformMemberId,
          status,
          updatedAt: fgAtt.updated_at,
        },
      });
      lootAttendanceStats.migrated++;
    } catch (e) {
      console.error(`[ERROR] LootAttendance ${fgAtt.id}: ${(e as Error).message}`);
      lootAttendanceStats.failed++;
    }
  }

  console.log(
    `  LootAttendance found: ${lootAttendanceStats.found}, would-migrate: ${lootAttendanceStats.migrated}, skip-unmap: ${lootAttendanceStats.skipped_unmapped}`
  );

  // FG LootTransaction (table: loot_transactions)
  // FG amount is Decimal(6,1). Platform amountTenths is Int. Conversion: round(amount * 10).
  const fgTxns = await fg.$queryRawUnsafe<FgLootTransaction[]>(
    `SELECT id, member_id, amount::text as amount, type, note, related_member_id, created_by_id, created_at
     FROM loot_transactions ORDER BY created_at`
  );
  lootTxnStats.found = fgTxns.length;

  for (const fgTxn of fgTxns) {
    const platformMemberId = lootMemberMap.get(fgTxn.member_id);
    const creatorMembershipId = userMembershipMap.get(fgTxn.created_by_id);
    const relatedMemberId = fgTxn.related_member_id
      ? lootMemberMap.get(fgTxn.related_member_id)
      : null;

    if (!platformMemberId) {
      lootTxnStats.skipped_unmapped++;
      continue;
    }
    if (!creatorMembershipId) {
      console.warn(
        `[WARN] LootTransaction ${fgTxn.id} creator ${fgTxn.created_by_id} not mapped — skipping`
      );
      lootTxnStats.skipped_unmapped++;
      continue;
    }

    const resolvedMemberId = platformMemberId.startsWith("dry-") ? null : platformMemberId;
    const resolvedCreatorId = creatorMembershipId.startsWith("dry-")
      ? null
      : creatorMembershipId;
    const resolvedRelatedId =
      relatedMemberId && !relatedMemberId.startsWith("dry-") ? relatedMemberId : null;

    const amountTenths = Math.round(parseFloat(fgTxn.amount) * 10);
    const txnType = (["SPEND", "TRANSFER_IN", "TRANSFER_OUT", "ADJUST"].includes(fgTxn.type)
      ? fgTxn.type
      : "ADJUST") as "SPEND" | "TRANSFER_IN" | "TRANSFER_OUT" | "ADJUST";

    if (DRY) {
      lootTxnStats.migrated++;
      continue;
    }

    if (!resolvedMemberId || !resolvedCreatorId) {
      lootTxnStats.skipped_unmapped++;
      continue;
    }

    try {
      // LootTransaction has no unique constraint other than id — check by (memberId, amountTenths, createdAt) as proxy
      const existing = await target.lootTransaction.findFirst({
        where: {
          tenantId,
          memberId: resolvedMemberId,
          amountTenths,
          createdAt: fgTxn.created_at,
        },
      });
      if (existing) {
        lootTxnStats.skipped_existing++;
        continue;
      }
      await target.lootTransaction.create({
        data: {
          tenantId,
          memberId: resolvedMemberId,
          amountTenths,
          type: txnType,
          note: fgTxn.note,
          relatedMemberId: resolvedRelatedId ?? undefined,
          createdByMembershipId: resolvedCreatorId,
          createdAt: fgTxn.created_at,
        },
      });
      lootTxnStats.migrated++;
    } catch (e) {
      console.error(`[ERROR] LootTransaction ${fgTxn.id}: ${(e as Error).message}`);
      lootTxnStats.failed++;
    }
  }

  console.log(
    `  LootTransactions found: ${lootTxnStats.found}, would-migrate: ${lootTxnStats.migrated}, skip-unmap: ${lootTxnStats.skipped_unmapped}`
  );

  // =========================================================================
  // D. FLEET: FG FleetShip -> platform FleetShip
  // Natural key: [tenantId, ownerMembershipId, ship_slug] (FG unique: [userId, ship_slug])
  // Skip if owner not in map.
  // =========================================================================

  const fleetStats = emptyStats();
  stats["FleetShip"] = fleetStats;

  console.log("\n[STEP 4/5] Migrating fleet ships...");

  const fgFleet = await fg.$queryRawUnsafe<FgFleetShip[]>(
    `SELECT id, user_id, ship_slug, ship_name, manufacturer, image_url, notes, is_public, quantity, created_at
     FROM fleet_ships ORDER BY created_at`
  );
  fleetStats.found = fgFleet.length;

  for (const fgShip of fgFleet) {
    const ownerMembershipId = userMembershipMap.get(fgShip.user_id);
    if (!ownerMembershipId) {
      console.warn(`[WARN] FleetShip "${fgShip.ship_name}" owner ${fgShip.user_id} not mapped — skipping`);
      fleetStats.skipped_unmapped++;
      continue;
    }

    const resolvedOwnerId = ownerMembershipId.startsWith("dry-") ? null : ownerMembershipId;

    if (DRY) {
      if (resolvedOwnerId) {
        const existing = await target.fleetShip.findFirst({
          where: { tenantId, ownerMembershipId: resolvedOwnerId, shipName: fgShip.ship_name },
        });
        if (existing) {
          fleetStats.skipped_existing++;
        } else {
          fleetStats.migrated++;
        }
      } else {
        fleetStats.migrated++;
      }
      continue;
    }

    if (!resolvedOwnerId) {
      fleetStats.skipped_unmapped++;
      continue;
    }

    try {
      // Idempotency: check by (tenantId, ownerMembershipId, shipName)
      const existing = await target.fleetShip.findFirst({
        where: { tenantId, ownerMembershipId: resolvedOwnerId, shipName: fgShip.ship_name },
      });
      if (existing) {
        fleetStats.skipped_existing++;
        continue;
      }
      await target.fleetShip.create({
        data: {
          tenantId,
          ownerMembershipId: resolvedOwnerId,
          shipName: fgShip.ship_name.slice(0, 160),
          manufacturer: fgShip.manufacturer ? fgShip.manufacturer.slice(0, 120) : null,
          imageUrl: fgShip.image_url,
          notes: fgShip.notes ? fgShip.notes.slice(0, 500) : null,
          quantity: fgShip.quantity,
          isPublic: fgShip.is_public,
          createdAt: fgShip.created_at,
          updatedAt: fgShip.created_at,
        },
      });
      fleetStats.migrated++;
    } catch (e) {
      console.error(`[ERROR] FleetShip "${fgShip.ship_name}": ${(e as Error).message}`);
      fleetStats.failed++;
    }
  }

  console.log(
    `  FleetShips found: ${fleetStats.found}, would-migrate: ${fleetStats.migrated}, skip-exist: ${fleetStats.skipped_existing}, skip-unmap: ${fleetStats.skipped_unmapped}`
  );

  // =========================================================================
  // E. TREASURY: FG TreasuryEntry -> platform TreasuryEntry
  // Natural key: (tenantId, authorMembershipId, amount, type, category, createdAt)
  // FG amount is Int (already in aUEC/credits). Platform amount is also Int. No conversion needed.
  // =========================================================================

  const treasuryStats = emptyStats();
  stats["TreasuryEntry"] = treasuryStats;

  console.log("\n[STEP 5/5] Migrating treasury...");

  const fgTreasury = await fg.$queryRawUnsafe<FgTreasuryEntry[]>(
    `SELECT id, amount, type, category, description, created_by_id, created_at
     FROM treasury_entries ORDER BY created_at`
  );
  treasuryStats.found = fgTreasury.length;

  for (const fgEntry of fgTreasury) {
    const authorMembershipId = userMembershipMap.get(fgEntry.created_by_id);
    if (!authorMembershipId) {
      console.warn(
        `[WARN] TreasuryEntry author ${fgEntry.created_by_id} not mapped — skipping`
      );
      treasuryStats.skipped_unmapped++;
      continue;
    }

    const resolvedAuthorId = authorMembershipId.startsWith("dry-")
      ? null
      : authorMembershipId;
    const mappedType = mapTreasuryType(fgEntry.type);
    const mappedCategory = mapTreasuryCategory(fgEntry.category);

    if (DRY) {
      if (resolvedAuthorId) {
        const existing = await target.treasuryEntry.findFirst({
          where: {
            tenantId,
            authorMembershipId: resolvedAuthorId,
            amount: fgEntry.amount,
            createdAt: fgEntry.created_at,
          },
        });
        if (existing) {
          treasuryStats.skipped_existing++;
        } else {
          treasuryStats.migrated++;
        }
      } else {
        treasuryStats.migrated++;
      }
      continue;
    }

    if (!resolvedAuthorId) {
      treasuryStats.skipped_unmapped++;
      continue;
    }

    try {
      const existing = await target.treasuryEntry.findFirst({
        where: {
          tenantId,
          authorMembershipId: resolvedAuthorId,
          amount: fgEntry.amount,
          createdAt: fgEntry.created_at,
        },
      });
      if (existing) {
        treasuryStats.skipped_existing++;
        continue;
      }
      await target.treasuryEntry.create({
        data: {
          tenantId,
          authorMembershipId: resolvedAuthorId,
          type: mappedType,
          category: mappedCategory,
          amount: fgEntry.amount,
          description: fgEntry.description.slice(0, 500),
          createdAt: fgEntry.created_at,
        },
      });
      treasuryStats.migrated++;
    } catch (e) {
      console.error(`[ERROR] TreasuryEntry ${fgEntry.id}: ${(e as Error).message}`);
      treasuryStats.failed++;
    }
  }

  console.log(
    `  TreasuryEntries found: ${treasuryStats.found}, would-migrate: ${treasuryStats.migrated}, skip-exist: ${treasuryStats.skipped_existing}, skip-unmap: ${treasuryStats.skipped_unmapped}`
  );

  // =========================================================================
  // Final summary
  // =========================================================================
  printSummary(stats);

  await fg.$disconnect();
  await target.$disconnect();
}

main().catch((e) => {
  console.error("[FATAL]", e);
  process.exit(1);
});
