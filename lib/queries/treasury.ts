import { db } from "../db";
import type { TenantContext } from "../tenant";
import type { TreasuryType, TreasuryCategory } from "../treasury";

export interface TreasuryRow {
  id: string;
  type: TreasuryType;
  category: TreasuryCategory;
  amount: number;
  description: string;
  createdAt: Date;
  authorName: string;
}

export async function listTreasuryEntries(
  ctx: TenantContext,
  filter?: { type?: TreasuryType; category?: TreasuryCategory },
): Promise<TreasuryRow[]> {
  const rows = await db(ctx).treasuryEntry.findMany({
    where: { type: filter?.type, category: filter?.category },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      type: true,
      category: true,
      amount: true,
      description: true,
      createdAt: true,
      author: { select: { displayName: true, username: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type as TreasuryType,
    category: r.category as TreasuryCategory,
    amount: r.amount,
    description: r.description,
    createdAt: r.createdAt,
    authorName: r.author?.displayName ?? r.author?.username ?? "Unknown",
  }));
}

export async function getTreasuryBalance(ctx: TenantContext): Promise<number> {
  const rows = await db(ctx).treasuryEntry.findMany({
    select: { type: true, amount: true },
  });
  return rows.reduce(
    (bal, r) => bal + (r.type === "INCOME" ? r.amount : -r.amount),
    0,
  );
}

export interface TreasurySummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: Record<string, number>;
}

export async function getTreasurySummary(ctx: TenantContext): Promise<TreasurySummary> {
  const rows = await db(ctx).treasuryEntry.findMany({
    select: { type: true, category: true, amount: true },
  });
  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, number> = {};
  for (const r of rows) {
    if (r.type === "INCOME") {
      totalIncome += r.amount;
    } else {
      totalExpense += r.amount;
    }
    byCategory[r.category] = (byCategory[r.category] ?? 0) + r.amount;
  }
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense, byCategory };
}
