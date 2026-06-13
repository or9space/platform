import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  updateBrandingCore, setFeatureFlagCore, upsertCustomFieldDefCore,
} from "@/lib/actions/tenant-config-core";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A } from "./setup";

async function commandAccount(tenantId: string) {
  const acc = await testPrisma.account.create({ data: { email: `cmd-${Math.random().toString(36).slice(2,6)}@it-test.example` } });
  await testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username: `cmd${Math.random().toString(36).slice(2,6)}`, tier: "COMMAND" } });
  return acc.id;
}
async function enlistedAccount(tenantId: string) {
  const acc = await testPrisma.account.create({ data: { email: `enl-${Math.random().toString(36).slice(2,6)}@it-test.example` } });
  await testPrisma.membership.create({ data: { accountId: acc.id, tenantId, username: `enl${Math.random().toString(36).slice(2,6)}`, tier: "ENLISTED" } });
  return acc.id;
}

describe("tenant-config write actions", () => {
  beforeEach(async () => {
    await resetDb();
    await testPrisma.tenantConfigOverride.deleteMany({});
    await testPrisma.tenantFeatureFlag.deleteMany({});
    await seedTwoTenants();
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("COMMAND can update branding name; persists to overrides", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    const r = await updateBrandingCore(TENANT_A.id, cmd, { name: "Alpha Renamed" });
    expect(r.ok).toBe(true);
    const row = await testPrisma.tenantConfigOverride.findUnique({ where: { tenantId: TENANT_A.id } });
    expect((row?.json as any).branding.name).toBe("Alpha Renamed");
  });

  it("ENLISTED is rejected", async () => {
    const enl = await enlistedAccount(TENANT_A.id);
    const r = await updateBrandingCore(TENANT_A.id, enl, { name: "Nope" });
    expect(r.ok).toBe(false);
  });

  it("deep-merges: setting labels keeps existing branding", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    await updateBrandingCore(TENANT_A.id, cmd, { name: "Keep Me" });
    const { updateLabelsCore } = await import("@/lib/actions/tenant-config-core");
    await updateLabelsCore(TENANT_A.id, cmd, { memberPlural: "Pilots" });
    const row = await testPrisma.tenantConfigOverride.findUnique({ where: { tenantId: TENANT_A.id } });
    expect((row?.json as any).branding.name).toBe("Keep Me");
    expect((row?.json as any).labels.memberPlural).toBe("Pilots");
  });

  it("COMMAND can toggle a feature flag (fleet on)", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    const r = await setFeatureFlagCore(TENANT_A.id, cmd, "FREE", "fleet", true);
    expect(r.ok).toBe(true);
    const ff = await testPrisma.tenantFeatureFlag.findUnique({ where: { tenantId_key: { tenantId: TENANT_A.id, key: "fleet" } } });
    expect(ff?.enabled).toBe(true);
  });

  it("FREE tenant cannot enable a paid-only flag (discord.bot)", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    const r = await setFeatureFlagCore(TENANT_A.id, cmd, "FREE", "discord.bot", true);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/paid/i);
  });

  it("cannot toggle platform-controlled ads", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    const r = await setFeatureFlagCore(TENANT_A.id, cmd, "FREE", "ads", false);
    expect(r.ok).toBe(false);
  });

  it("custom field def: COMMAND adds one to forum_thread", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    const r = await upsertCustomFieldDefCore(TENANT_A.id, cmd, "forum_thread", {
      key: "bounty", label: "Bounty", kind: "number",
    });
    expect(r.ok).toBe(true);
    const row = await testPrisma.tenantConfigOverride.findUnique({ where: { tenantId: TENANT_A.id } });
    expect((row?.json as any).customFields.forum_thread[0].key).toBe("bounty");
  });

  it("custom field def: rejects a 4th field on the same type (max 3)", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    for (const k of ["a", "b", "c"]) {
      await upsertCustomFieldDefCore(TENANT_A.id, cmd, "forum_thread", { key: k, label: k.toUpperCase(), kind: "text" });
    }
    const r = await upsertCustomFieldDefCore(TENANT_A.id, cmd, "forum_thread", { key: "d", label: "D", kind: "text" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/3/);
  });

  it("custom field def: rejects an ineligible type (forum_post)", async () => {
    const cmd = await commandAccount(TENANT_A.id);
    const r = await upsertCustomFieldDefCore(TENANT_A.id, cmd, "forum_post" as any, { key: "x", label: "X", kind: "text" });
    expect(r.ok).toBe(false);
  });
});
