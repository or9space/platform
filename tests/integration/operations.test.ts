import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  createOperationCore, updateOperationCore, setOperationStatusCore, deleteOperationCore,
  signupOperationCore, withdrawOperationCore,
} from "@/lib/actions/operations-core";
import { listOperations, getOperation, getMySignup } from "@/lib/queries/operations";
import { makeTenantContext } from "@/lib/tenant";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = () => makeTenantContext(TENANT_A.id);

describe("operations", () => {
  let officer: string;
  let enlisted: string;
  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    await seedTwoTenants();
    const a = await testPrisma.account.create({ data: { email: "oo@it-test.example" } });
    officer = (await testPrisma.membership.create({ data: { accountId: a.id, tenantId: TENANT_A.id, username: "oo", tier: "OFFICER" } })).id;
    const b = await testPrisma.account.create({ data: { email: "oe@it-test.example" } });
    enlisted = (await testPrisma.membership.create({ data: { accountId: b.id, tenantId: TENANT_A.id, username: "oe", tier: "ENLISTED" } })).id;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("officer creates; enlisted cannot", async () => {
    expect((await createOperationCore(TENANT_A.id, officer, "OFFICER", { title: "Raid Daymar" })).ok).toBe(true);
    expect((await createOperationCore(TENANT_A.id, enlisted, "ENLISTED", { title: "Nope" })).ok).toBe(false);
  });

  it("members sign up with a role; upsert updates; withdraw removes", async () => {
    const r = await createOperationCore(TENANT_A.id, officer, "OFFICER", { title: "Escort" });
    if (!r.ok) throw new Error("create failed");
    const id = r.operationId;
    expect((await signupOperationCore(TENANT_A.id, enlisted, { operationId: id, role: "Gunner" })).ok).toBe(true);
    expect((await getMySignup(ctxA(), id, enlisted))?.role).toBe("Gunner");
    // upsert: change role, not duplicate
    await signupOperationCore(TENANT_A.id, enlisted, { operationId: id, role: "Pilot" });
    let op = await getOperation(ctxA(), id);
    expect(op?.signups).toHaveLength(1);
    expect(op?.signups[0]?.role).toBe("Pilot");
    // withdraw
    expect((await withdrawOperationCore(TENANT_A.id, enlisted, id)).ok).toBe(true);
    op = await getOperation(ctxA(), id);
    expect(op?.signups).toHaveLength(0);
  });

  it("officer changes status; enlisted cannot", async () => {
    const r = await createOperationCore(TENANT_A.id, officer, "OFFICER", { title: "Patrol" });
    if (!r.ok) throw new Error("create failed");
    expect((await setOperationStatusCore(TENANT_A.id, officer, "OFFICER", r.operationId, "ACTIVE")).ok).toBe(true);
    expect((await getOperation(ctxA(), r.operationId))?.status).toBe("ACTIVE");
    expect((await setOperationStatusCore(TENANT_A.id, enlisted, "ENLISTED", r.operationId, "COMPLETED")).ok).toBe(false);
    expect((await setOperationStatusCore(TENANT_A.id, officer, "OFFICER", r.operationId, "NONSENSE")).ok).toBe(false);
  });

  it("officer edits and deletes", async () => {
    const r = await createOperationCore(TENANT_A.id, officer, "OFFICER", { title: "Edit me" });
    if (!r.ok) throw new Error("create failed");
    expect((await updateOperationCore(TENANT_A.id, officer, "OFFICER", r.operationId, { title: "Edited", status: "BRIEFING" })).ok).toBe(true);
    const op = await getOperation(ctxA(), r.operationId);
    expect(op?.title).toBe("Edited");
    expect(op?.status).toBe("BRIEFING");
    expect((await deleteOperationCore(TENANT_A.id, officer, "OFFICER", r.operationId)).ok).toBe(true);
    expect(await getOperation(ctxA(), r.operationId)).toBeNull();
  });

  it("does not leak across tenants", async () => {
    const r = await createOperationCore(TENANT_A.id, officer, "OFFICER", { title: "Secret Op" });
    if (!r.ok) throw new Error("create failed");
    expect(await getOperation(makeTenantContext(TENANT_B.id), r.operationId)).toBeNull();
    expect(await listOperations(makeTenantContext(TENANT_B.id))).toHaveLength(0);
  });
});
