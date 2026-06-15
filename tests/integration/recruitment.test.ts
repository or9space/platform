import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  submitApplicationCore, approveApplicationCore, rejectApplicationCore,
} from "@/lib/actions/recruitment-core";
import { listApplications, countPendingApplications } from "@/lib/queries/recruitment";
import { makeTenantContext } from "@/lib/tenant";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = () => makeTenantContext(TENANT_A.id);

describe("recruitment (public applications)", () => {
  let officer: string;
  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    await seedTwoTenants();
    const a = await testPrisma.account.create({ data: { email: "ro@it-test.example" } });
    officer = (await testPrisma.membership.create({ data: { accountId: a.id, tenantId: TENANT_A.id, username: "ro", tier: "OFFICER" } })).id;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  const applicant = { handle: "nova", email: "nova@it-test.example", message: "I want to fly with you all the time." };

  it("anonymous visitor submits an application; it shows as PENDING", async () => {
    const r = await submitApplicationCore(TENANT_A.id, applicant);
    expect(r.ok).toBe(true);
    expect(await countPendingApplications(ctxA())).toBe(1);
    const apps = await listApplications(ctxA());
    expect(apps[0]?.status).toBe("PENDING");
    expect(apps[0]?.handle).toBe("nova");
  });

  it("rejects a second pending application from the same email", async () => {
    expect((await submitApplicationCore(TENANT_A.id, applicant)).ok).toBe(true);
    const dup = await submitApplicationCore(TENANT_A.id, applicant);
    expect(dup.ok).toBe(false);
  });

  it("validates input (bad handle, short message)", async () => {
    expect((await submitApplicationCore(TENANT_A.id, { handle: "x", email: "a@it-test.example", message: "long enough message here" })).ok).toBe(false);
    expect((await submitApplicationCore(TENANT_A.id, { handle: "good", email: "a@it-test.example", message: "short" })).ok).toBe(false);
  });

  it("officer approves: creates account + ENLISTED membership + set-password link", async () => {
    const s = await submitApplicationCore(TENANT_A.id, applicant);
    if (!s.ok) throw new Error();
    const r = await approveApplicationCore(TENANT_A.id, officer, "OFFICER", s.id);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.setPasswordPath).toContain("/set-password?token=");

    const m = await testPrisma.membership.findFirst({ where: { tenantId: TENANT_A.id, username: "nova" } });
    expect(m?.tier).toBe("ENLISTED");
    const acct = await testPrisma.account.findUnique({ where: { email: "nova@it-test.example" } });
    expect(acct).not.toBeNull();
    expect(acct?.passwordHash ?? null).toBeNull(); // passwordless until the link is used

    const apps = await listApplications(ctxA());
    expect(apps[0]?.status).toBe("APPROVED");
  });

  it("non-officer cannot approve or reject", async () => {
    const s = await submitApplicationCore(TENANT_A.id, applicant);
    if (!s.ok) throw new Error();
    expect((await approveApplicationCore(TENANT_A.id, officer, "ENLISTED", s.id)).ok).toBe(false);
    expect((await rejectApplicationCore(TENANT_A.id, officer, "ENLISTED", s.id, null)).ok).toBe(false);
  });

  it("officer rejects with a note", async () => {
    const s = await submitApplicationCore(TENANT_A.id, applicant);
    if (!s.ok) throw new Error();
    const r = await rejectApplicationCore(TENANT_A.id, officer, "OFFICER", s.id, "Not enough flight hours");
    expect(r.ok).toBe(true);
    const apps = await listApplications(ctxA());
    expect(apps[0]?.status).toBe("REJECTED");
    expect(apps[0]?.reviewNote).toBe("Not enough flight hours");
  });

  it("blocks approval when the desired handle is already taken", async () => {
    await testPrisma.account.create({ data: { email: "taken@it-test.example" } })
      .then((a) => testPrisma.membership.create({ data: { accountId: a.id, tenantId: TENANT_A.id, username: "nova", tier: "ENLISTED" } }));
    const s = await submitApplicationCore(TENANT_A.id, applicant);
    if (!s.ok) throw new Error();
    const r = await approveApplicationCore(TENANT_A.id, officer, "OFFICER", s.id);
    expect(r.ok).toBe(false);
  });

  it("does not leak applications across tenants", async () => {
    const s = await submitApplicationCore(TENANT_A.id, applicant);
    if (!s.ok) throw new Error();
    expect(await listApplications(makeTenantContext(TENANT_B.id))).toHaveLength(0);
    // an officer in B cannot approve A's application
    expect((await approveApplicationCore(TENANT_B.id, officer, "OFFICER", s.id)).ok).toBe(false);
  });
});
