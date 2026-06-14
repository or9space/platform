import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { setPasswordWithToken, peekSetupToken } from "@/lib/actions/account-setup";
import { verifyPassword } from "@/lib/password";
import { testPrisma, resetDb, closeDb } from "./setup";

const sha = (raw: string) => createHash("sha256").update(raw).digest("hex");

async function makeAccount(email: string) {
  return testPrisma.account.create({ data: { email } });
}
async function makeToken(accountId: string, raw: string, expiresAt: Date, usedAt: Date | null = null) {
  await testPrisma.loginSetupToken.create({
    data: { tokenHash: sha(raw), accountId, expiresAt, usedAt },
  });
}

describe("account set-password tokens", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await resetDb();
    await closeDb();
  });

  it("peek reveals the target email for a valid token", async () => {
    const acc = await makeAccount("setpw1@it-test.example");
    await makeToken(acc.id, "raw-valid-1", new Date(Date.now() + 60_000));
    const r = await peekSetupToken("raw-valid-1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.email).toBe("setpw1@it-test.example");
  });

  it("sets the password, marks the token used, and the password verifies", async () => {
    const acc = await makeAccount("setpw2@it-test.example");
    await makeToken(acc.id, "raw-valid-2", new Date(Date.now() + 60_000));

    const res = await setPasswordWithToken({ token: "raw-valid-2", password: "correct horse battery" });
    expect(res.ok).toBe(true);

    const updated = await testPrisma.account.findUnique({ where: { id: acc.id } });
    expect(updated?.passwordHash).toBeTruthy();
    expect(await verifyPassword("correct horse battery", updated!.passwordHash!)).toBe(true);

    const tok = await testPrisma.loginSetupToken.findUnique({ where: { tokenHash: sha("raw-valid-2") } });
    expect(tok?.usedAt).not.toBeNull();
  });

  it("rejects a second use of the same token", async () => {
    const acc = await makeAccount("setpw3@it-test.example");
    await makeToken(acc.id, "raw-once", new Date(Date.now() + 60_000));
    const first = await setPasswordWithToken({ token: "raw-once", password: "first-password-xy" });
    expect(first.ok).toBe(true);
    const second = await setPasswordWithToken({ token: "raw-once", password: "second-password-z" });
    expect(second.ok).toBe(false);
  });

  it("rejects an expired token", async () => {
    const acc = await makeAccount("setpw4@it-test.example");
    await makeToken(acc.id, "raw-expired", new Date(Date.now() - 1000));
    const res = await setPasswordWithToken({ token: "raw-expired", password: "whatever-1234" });
    expect(res.ok).toBe(false);
    const updated = await testPrisma.account.findUnique({ where: { id: acc.id } });
    expect(updated?.passwordHash).toBeNull();
  });

  it("rejects an unknown token", async () => {
    const res = await setPasswordWithToken({ token: "does-not-exist", password: "whatever-1234" });
    expect(res.ok).toBe(false);
  });

  it("rejects a too-short password", async () => {
    const acc = await makeAccount("setpw5@it-test.example");
    await makeToken(acc.id, "raw-short", new Date(Date.now() + 60_000));
    const res = await setPasswordWithToken({ token: "raw-short", password: "short" });
    expect(res.ok).toBe(false);
  });
});
