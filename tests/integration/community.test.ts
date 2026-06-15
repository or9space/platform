import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createResourceCore, deleteResourceCore } from "@/lib/actions/resources-core";
import { listResources } from "@/lib/queries/resources";
import { createLfgCore, deleteLfgCore } from "@/lib/actions/lfg-core";
import { listLfg } from "@/lib/queries/lfg";
import { createAllianceCore, deleteAllianceCore } from "@/lib/actions/alliances-core";
import { listAlliances } from "@/lib/queries/alliances";
import { makeTenantContext } from "@/lib/tenant";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = () => makeTenantContext(TENANT_A.id);
const ctxB = () => makeTenantContext(TENANT_B.id);

describe("community features (resources / lfg / alliances)", () => {
  let officer: string;
  let enlisted: string;
  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    await seedTwoTenants();
    const a = await testPrisma.account.create({ data: { email: "co@it-test.example" } });
    officer = (await testPrisma.membership.create({ data: { accountId: a.id, tenantId: TENANT_A.id, username: "co", tier: "OFFICER" } })).id;
    const b = await testPrisma.account.create({ data: { email: "ce@it-test.example" } });
    enlisted = (await testPrisma.membership.create({ data: { accountId: b.id, tenantId: TENANT_A.id, username: "ce", tier: "ENLISTED" } })).id;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("resources: officer creates, enlisted cannot, no cross-tenant leak", async () => {
    expect((await createResourceCore(TENANT_A.id, officer, "OFFICER", { title: "UEX guide", url: "https://uex.com" })).ok).toBe(true);
    expect((await createResourceCore(TENANT_A.id, enlisted, "ENLISTED", { title: "x" })).ok).toBe(false);
    expect(await listResources(ctxA())).toHaveLength(1);
    expect(await listResources(ctxB())).toHaveLength(0);
  });

  it("lfg: any member posts; author can delete; officer can delete others", async () => {
    const mine = await createLfgCore(TENANT_A.id, enlisted, { title: "Need a gunner" });
    expect(mine.ok).toBe(true);
    if (!mine.ok) throw new Error();
    // non-author non-officer cannot delete
    const other = await testPrisma.account.create({ data: { email: "cx@it-test.example" } });
    const otherM = (await testPrisma.membership.create({ data: { accountId: other.id, tenantId: TENANT_A.id, username: "cx", tier: "ENLISTED" } })).id;
    expect((await deleteLfgCore(TENANT_A.id, otherM, "ENLISTED", mine.id)).ok).toBe(false);
    // author can
    expect((await deleteLfgCore(TENANT_A.id, enlisted, "ENLISTED", mine.id)).ok).toBe(true);
    // officer can delete anyone's
    const p2 = await createLfgCore(TENANT_A.id, enlisted, { title: "Another" });
    if (!p2.ok) throw new Error();
    expect((await deleteLfgCore(TENANT_A.id, officer, "OFFICER", p2.id)).ok).toBe(true);
    expect(await listLfg(ctxA())).toHaveLength(0);
  });

  it("alliances: officer creates, enlisted cannot, no cross-tenant leak", async () => {
    const r = await createAllianceCore(TENANT_A.id, officer, "OFFICER", { name: "Friends", status: "ALLY", link: "https://x.com" });
    expect(r.ok).toBe(true);
    expect((await createAllianceCore(TENANT_A.id, enlisted, "ENLISTED", { name: "Nope" })).ok).toBe(false);
    expect(await listAlliances(ctxA())).toHaveLength(1);
    expect(await listAlliances(ctxB())).toHaveLength(0);
    if (r.ok) expect((await deleteAllianceCore(TENANT_A.id, officer, "OFFICER", r.id)).ok).toBe(true);
  });
});
