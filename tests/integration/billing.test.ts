import { describe, it, expect, beforeEach, afterAll, afterEach } from "vitest";
import { startUpgradeCore } from "@/lib/actions/billing-core";
import { ext } from "@/lib/extensions/registry";
import { noOpBillingProvider, type BillingProvider } from "@/lib/extensions/billing-provider";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A } from "./setup";

async function commandAccount(tenantId: string) {
  const acc = await testPrisma.account.create({
    data: { email: `cmd-${Math.random().toString(36).slice(2, 6)}@it-test.example` },
  });
  await testPrisma.membership.create({
    data: {
      accountId: acc.id,
      tenantId,
      username: `cmd${Math.random().toString(36).slice(2, 6)}`,
      tier: "COMMAND",
    },
  });
  return acc.id;
}

async function enlistedAccount(tenantId: string) {
  const acc = await testPrisma.account.create({
    data: { email: `enl-${Math.random().toString(36).slice(2, 6)}@it-test.example` },
  });
  await testPrisma.membership.create({
    data: {
      accountId: acc.id,
      tenantId,
      username: `enl${Math.random().toString(36).slice(2, 6)}`,
      tier: "ENLISTED",
    },
  });
  return acc.id;
}

describe("billing actions", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTwoTenants();
  });
  afterAll(async () => {
    await resetDb();
    await closeDb();
  });
  // Restore noOp provider after each test in case a test swapped it.
  afterEach(() => {
    ext.register("billingProvider", noOpBillingProvider);
  });

  it("noOp provider (OSS default) → returns ok:false with self-host message for COMMAND", async () => {
    // ext.billingProvider is noOp by default (OSS deployment)
    expect(ext.billingProvider.kind).toBe("noop");
    const cmd = await commandAccount(TENANT_A.id);
    const r = await startUpgradeCore(TENANT_A.id, cmd, "price_test_123");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/self-host/i);
      expect(r.error).toMatch(/or9\.space/i);
    }
  });

  it("ENLISTED member → ok:false (guardCommand rejects) regardless of provider", async () => {
    const enl = await enlistedAccount(TENANT_A.id);
    const r = await startUpgradeCore(TENANT_A.id, enl, "price_test_123");
    expect(r.ok).toBe(false);
  });

  it("fake stripe provider registered → ok:true + url returned for COMMAND", async () => {
    const fakeProvider: BillingProvider = {
      kind: "stripe",
      createCheckoutSession: async () => ({ url: "https://checkout.stripe.com/test-session" }),
      cancelSubscription: async () => ({ ok: true }),
    };
    ext.register("billingProvider", fakeProvider);

    const cmd = await commandAccount(TENANT_A.id);
    const r = await startUpgradeCore(TENANT_A.id, cmd, "price_test_123");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url).toBe("https://checkout.stripe.com/test-session");
    }
  });

  it("fake stripe provider returning null → ok:false with checkout error", async () => {
    const fakeProvider: BillingProvider = {
      kind: "stripe",
      createCheckoutSession: async () => null,
      cancelSubscription: async () => ({ ok: true }),
    };
    ext.register("billingProvider", fakeProvider);

    const cmd = await commandAccount(TENANT_A.id);
    const r = await startUpgradeCore(TENANT_A.id, cmd, "price_test_123");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/checkout/i);
    }
  });
});
