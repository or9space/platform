import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

/**
 * Applies RLS roles + policies. Run with a superuser connection:
 *   APP_USER_PASSWORD=<pw> pnpm db:setup-rls
 * Uses DIRECT_URL (superuser). Idempotent.
 *
 * CORRECTNESS NOTE — connection_limit=1:
 * set_config(..., false) is session-scoped. Without connection_limit=1, Prisma's
 * default pool could route the set_config call and the DO $$ block to different
 * physical connections, making current_setting('app.bootstrap_password') appear
 * empty in the DO block and causing the role to be created with an empty password.
 * We append connection_limit=1 to force a single-connection pool so all statements
 * share the same session.
 */
async function main() {
  const rawUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!rawUrl) throw new Error("DIRECT_URL or DATABASE_URL required");

  const dbName = new URL(rawUrl).pathname.replace(/^\//, "").split("?")[0];
  const appPassword = process.env.APP_USER_PASSWORD;

  // Append connection_limit=1 so set_config and the DO block share the same session.
  const urlObj = new URL(rawUrl);
  urlObj.searchParams.set("connection_limit", "1");
  const url = urlObj.toString();

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    if (appPassword) {
      await prisma.$executeRawUnsafe(
        `SELECT set_config('app.bootstrap_password', '${appPassword.replace(/'/g, "''")}', false)`,
      );
    }
    const rolesSql = fs
      .readFileSync(path.join(process.cwd(), "prisma", "rls", "setup-roles.sql"), "utf8")
      .replace(/CURRENT_DATABASE/g, `"${dbName}"`);
    const policiesSql = fs.readFileSync(path.join(process.cwd(), "prisma", "rls", "policies.sql"), "utf8");

    for (const block of splitSql(rolesSql)) await prisma.$executeRawUnsafe(block);
    for (const block of splitSql(policiesSql)) await prisma.$executeRawUnsafe(block);
    console.log("RLS roles + policies applied");
  } finally {
    await prisma.$disconnect();
  }
}

/** Split on semicolons at top level; keep $$..$$ bodies intact. */
function splitSql(sql: string): string[] {
  const blocks: string[] = [];
  let current = "";
  let inDollar = false;
  for (const line of sql.split("\n")) {
    if (line.trim().startsWith("--")) continue;
    if (line.includes("$$")) inDollar = !inDollar;
    current += line + "\n";
    if (!inDollar && line.trimEnd().endsWith(";")) {
      const stmt = current.trim();
      if (stmt.length > 1) blocks.push(stmt);
      current = "";
    }
  }
  if (current.trim()) blocks.push(current.trim());
  return blocks;
}

main();
