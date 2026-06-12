import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { claimFounderSeat } from "@/lib/actions/claim";
import { provisionApprovedTenant } from "@/lib/provisioning";
import { testPrisma, resetDb, closeDb } from "./setup";

describe("claimFounderSeat", () => {
  let claimToken: string;
  let tenantId: string;

  beforeEach(async () => {
    await resetDb();
    await testPrisma.tenantConfigOverride.deleteMany({});
    const pending = await testPrisma.pendingTenant.create({
      data: { slug: "it-claim", name: "Claim Org", requestedEmail: "f@it-test.example", description: "d" },
    });
    const r = await provisionApprovedTenant(pending.id);
    if (!r.ok) throw new Error("provision failed");
    claimToken = r.claimToken;
    tenantId = r.tenantId;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("claims: COMMAND membership created, token burned", async () => {
    const r = await claimFounderSeat({
      tenantSlug: "it-claim", token: claimToken,
      email: "f@it-test.example", password: "longenoughpw", username: "founder",
    });
    expect(r.ok).toBe(true);
    const m = await testPrisma.membership.findFirst({ where: { tenantId } });
    expect(m?.tier).toBe("COMMAND");
    const t = await testPrisma.tenant.findUnique({ where: { id: tenantId } });
    expect(t?.founderClaimTokenHash).toBeNull();
  });

  it("rejects a wrong token", async () => {
    const r = await claimFounderSeat({
      tenantSlug: "it-claim", token: "deadbeef".repeat(8),
      email: "f@it-test.example", password: "longenoughpw", username: "founder",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects reuse after a successful claim", async () => {
    await claimFounderSeat({
      tenantSlug: "it-claim", token: claimToken,
      email: "f@it-test.example", password: "longenoughpw", username: "founder",
    });
    const again = await claimFounderSeat({
      tenantSlug: "it-claim", token: claimToken,
      email: "f2@it-test.example", password: "longenoughpw", username: "founder2",
    });
    expect(again.ok).toBe(false);
  });

  it("atomic burn: two concurrent valid claims yield exactly one COMMAND founder", async () => {
    const [a, b] = await Promise.all([
      claimFounderSeat({
        tenantSlug: "it-claim", token: claimToken,
        email: "race1@it-test.example", password: "longenoughpw", username: "racer1",
      }),
      claimFounderSeat({
        tenantSlug: "it-claim", token: claimToken,
        email: "race2@it-test.example", password: "longenoughpw", username: "racer2",
      }),
    ]);
    const winners = [a, b].filter((r) => r.ok).length;
    expect(winners).toBe(1);
    const founders = await testPrisma.membership.count({ where: { tenantId, tier: "COMMAND" } });
    expect(founders).toBe(1);
  });

  it("rejects an expired token", async () => {
    await testPrisma.tenant.update({
      where: { id: tenantId },
      data: { founderClaimExpiresAt: new Date(Date.now() - 1000) },
    });
    const r = await claimFounderSeat({
      tenantSlug: "it-claim", token: claimToken,
      email: "f@it-test.example", password: "longenoughpw", username: "founder",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/expired/i);
  });
});
