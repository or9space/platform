import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { runPendingCleanup } from "@/lib/pending-cleanup";
import { testPrisma, resetDb, closeDb } from "./setup";

describe("runPendingCleanup", () => {
  beforeEach(async () => { await resetDb(); });
  afterAll(async () => { await resetDb(); await closeDb(); });

  async function makePending(ageDays: number, status: "PENDING" | "APPROVED" = "PENDING") {
    const created = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000);
    return testPrisma.pendingTenant.create({
      data: {
        slug: `it-age${ageDays}-${Math.random().toString(36).slice(2, 7)}`,
        name: "Aging Org", requestedEmail: "age@it-test.example", description: "d",
        status, createdAt: created,
      },
    });
  }

  it("auto-rejects PENDING rows older than 30 days", async () => {
    const old = await makePending(31);
    const fresh = await makePending(2);
    const result = await runPendingCleanup();
    expect(result.rejected).toBeGreaterThanOrEqual(1);
    const oldRow = await testPrisma.pendingTenant.findUnique({ where: { id: old.id } });
    const freshRow = await testPrisma.pendingTenant.findUnique({ where: { id: fresh.id } });
    expect(oldRow?.status).toBe("REJECTED");
    expect(freshRow?.status).toBe("PENDING");
  });

  it("does not touch APPROVED rows even if old", async () => {
    const oldApproved = await makePending(40, "APPROVED");
    await runPendingCleanup();
    const row = await testPrisma.pendingTenant.findUnique({ where: { id: oldApproved.id } });
    expect(row?.status).toBe("APPROVED");
  });

  it("reports a reminder count for rows aged past the reminder threshold (7d) but under 30d", async () => {
    await makePending(10);
    await makePending(2);
    const result = await runPendingCleanup();
    expect(result.reminders).toBeGreaterThanOrEqual(1);
  });
});
