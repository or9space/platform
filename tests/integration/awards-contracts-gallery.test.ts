import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createAwardCore, deleteAwardCore, grantAwardCore, revokeAwardCore } from "@/lib/actions/awards-core";
import { listAwardsWithRecipients, listMemberAwards } from "@/lib/queries/awards";
import { createContractCore, claimContractCore, unclaimContractCore, setContractStatusCore, deleteContractCore } from "@/lib/actions/contracts-core";
import { listContracts } from "@/lib/queries/contracts";
import { createGalleryCore, deleteGalleryCore } from "@/lib/actions/gallery-core";
import { listGallery } from "@/lib/queries/gallery";
import { makeTenantContext } from "@/lib/tenant";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = () => makeTenantContext(TENANT_A.id);

describe("awards / contracts / gallery", () => {
  let officer: string;
  let enlisted: string;
  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    await seedTwoTenants();
    const a = await testPrisma.account.create({ data: { email: "ao@it-test.example" } });
    officer = (await testPrisma.membership.create({ data: { accountId: a.id, tenantId: TENANT_A.id, username: "ao", tier: "OFFICER" } })).id;
    const b = await testPrisma.account.create({ data: { email: "ae@it-test.example" } });
    enlisted = (await testPrisma.membership.create({ data: { accountId: b.id, tenantId: TENANT_A.id, username: "ae", tier: "ENLISTED" } })).id;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("awards: officer creates + grants by username; revoke removes; enlisted blocked", async () => {
    const r = await createAwardCore(TENANT_A.id, officer, "OFFICER", { name: "Ace" });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect((await createAwardCore(TENANT_A.id, enlisted, "ENLISTED", { name: "x" })).ok).toBe(false);

    expect((await grantAwardCore(TENANT_A.id, officer, "OFFICER", { awardId: r.id, username: "ae", note: "earned" })).ok).toBe(true);
    expect((await grantAwardCore(TENANT_A.id, officer, "OFFICER", { awardId: r.id, username: "ghost" })).ok).toBe(false);

    let awards = await listAwardsWithRecipients(ctxA());
    expect(awards[0]?.recipients).toHaveLength(1);
    expect(await listMemberAwards(ctxA(), enlisted)).toHaveLength(1);

    expect((await revokeAwardCore(TENANT_A.id, officer, "OFFICER", r.id, enlisted)).ok).toBe(true);
    awards = await listAwardsWithRecipients(ctxA());
    expect(awards[0]?.recipients).toHaveLength(0);

    expect((await deleteAwardCore(TENANT_A.id, officer, "OFFICER", r.id)).ok).toBe(true);
    expect(await listAwardsWithRecipients(ctxA())).toHaveLength(0);
  });

  it("contracts: claim is single-winner; claimant releases; officer completes", async () => {
    const r = await createContractCore(TENANT_A.id, officer, "OFFICER", { title: "Haul cargo", reward: "50k" });
    if (!r.ok) throw new Error();
    const id = r.id;
    expect((await claimContractCore(TENANT_A.id, enlisted, id)).ok).toBe(true);
    // second claim fails (already claimed)
    expect((await claimContractCore(TENANT_A.id, officer, id)).ok).toBe(false);
    let c = (await listContracts(ctxA()))[0];
    expect(c.status).toBe("CLAIMED");
    expect(c.claimedById).toBe(enlisted);
    // non-claimant non-officer cannot release
    const x = await testPrisma.account.create({ data: { email: "ax@it-test.example" } });
    const xm = (await testPrisma.membership.create({ data: { accountId: x.id, tenantId: TENANT_A.id, username: "ax", tier: "ENLISTED" } })).id;
    expect((await unclaimContractCore(TENANT_A.id, xm, "ENLISTED", id)).ok).toBe(false);
    // claimant releases
    expect((await unclaimContractCore(TENANT_A.id, enlisted, "ENLISTED", id)).ok).toBe(true);
    c = (await listContracts(ctxA()))[0];
    expect(c.status).toBe("OPEN");
    expect(c.claimedById).toBeNull();
    // officer completes; enlisted cannot
    expect((await setContractStatusCore(TENANT_A.id, enlisted, "ENLISTED", id, "COMPLETED")).ok).toBe(false);
    expect((await setContractStatusCore(TENANT_A.id, officer, "OFFICER", id, "COMPLETED")).ok).toBe(true);
    expect((await listContracts(ctxA()))[0].status).toBe("COMPLETED");
    expect((await deleteContractCore(TENANT_A.id, officer, "OFFICER", id)).ok).toBe(true);
  });

  it("gallery: any member posts; author or officer deletes; URL validated; isolation", async () => {
    const bad = await createGalleryCore(TENANT_A.id, enlisted, { imageUrl: "not-a-url" });
    expect(bad.ok).toBe(false);
    const g = await createGalleryCore(TENANT_A.id, enlisted, { imageUrl: "https://img.example/x.png", title: "Shot" });
    expect(g.ok).toBe(true);
    if (!g.ok) throw new Error();
    // another enlisted cannot delete
    const x = await testPrisma.account.create({ data: { email: "gx@it-test.example" } });
    const xm = (await testPrisma.membership.create({ data: { accountId: x.id, tenantId: TENANT_A.id, username: "gx", tier: "ENLISTED" } })).id;
    expect((await deleteGalleryCore(TENANT_A.id, xm, "ENLISTED", g.id)).ok).toBe(false);
    // author can
    expect((await deleteGalleryCore(TENANT_A.id, enlisted, "ENLISTED", g.id)).ok).toBe(true);
    expect(await listGallery(makeTenantContext(TENANT_B.id))).toHaveLength(0);
  });
});
