import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { registerAccountWithMembership } from "@/lib/actions/register";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

describe("registerAccountWithMembership", () => {
  beforeEach(async () => {
    _resetRateLimitStore(); // isolate in-memory rate limiter between tests
    await resetDb();
    await seedTwoTenants();
  });
  afterAll(async () => {
    await resetDb();
    await closeDb();
  });

  it("creates account + ENLISTED membership", async () => {
    const result = await registerAccountWithMembership({
      tenantId: TENANT_A.id,
      email: "joe@it-test.example",
      password: "longenoughpw",
      username: "joe",
    });
    expect(result.ok).toBe(true);
    const m = await testPrisma.membership.findFirst({ where: { username: "joe" } });
    expect(m?.tenantId).toBe(TENANT_A.id);
    expect(m?.tier).toBe("ENLISTED");
  });

  it("rejects a second membership for the same account (Q13 v1 guard)", async () => {
    await registerAccountWithMembership({
      tenantId: TENANT_A.id, email: "joe@it-test.example", password: "longenoughpw", username: "joe",
    });
    const second = await registerAccountWithMembership({
      tenantId: TENANT_B.id, email: "joe@it-test.example", password: "longenoughpw", username: "joe2",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/already a member/i);
  });

  it("rejects duplicate username within a tenant", async () => {
    await registerAccountWithMembership({
      tenantId: TENANT_A.id, email: "a@it-test.example", password: "longenoughpw", username: "samename",
    });
    const dup = await registerAccountWithMembership({
      tenantId: TENANT_A.id, email: "b@it-test.example", password: "longenoughpw", username: "samename",
    });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error).toMatch(/username/i);
  });

  it("rejects invalid email / short password / bad username", async () => {
    const bad = await registerAccountWithMembership({
      tenantId: TENANT_A.id, email: "not-an-email", password: "longenoughpw", username: "x",
    });
    expect(bad.ok).toBe(false);
  });
});
