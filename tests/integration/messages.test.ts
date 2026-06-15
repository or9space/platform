import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { startConversationCore, sendMessageCore, markReadCore } from "@/lib/actions/messages-core";
import { listConversations, getConversationThread, countUnreadMessages } from "@/lib/queries/messages";
import { makeTenantContext } from "@/lib/tenant";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = () => makeTenantContext(TENANT_A.id);

async function member(tenantId: string, username: string) {
  const a = await testPrisma.account.create({ data: { email: `${username}@it-test.example` } });
  return (await testPrisma.membership.create({ data: { accountId: a.id, tenantId, username, tier: "ENLISTED" } })).id;
}

describe("messages (1:1 DMs)", () => {
  let alice: string;
  let bob: string;
  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    await seedTwoTenants();
    alice = await member(TENANT_A.id, "alice");
    bob = await member(TENANT_A.id, "bob");
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("starts a conversation, dedups on repeat, blocks self-DM and unknown users", async () => {
    const c1 = await startConversationCore(TENANT_A.id, alice, "bob");
    expect(c1.ok).toBe(true);
    if (!c1.ok) throw new Error();
    const c2 = await startConversationCore(TENANT_A.id, bob, "alice");
    expect(c2.ok).toBe(true);
    if (!c2.ok) throw new Error();
    expect(c2.id).toBe(c1.id); // same 1:1 thread regardless of who starts it

    expect((await startConversationCore(TENANT_A.id, alice, "alice")).ok).toBe(false);
    expect((await startConversationCore(TENANT_A.id, alice, "ghost")).ok).toBe(false);
  });

  it("sends messages; only participants can; thread shows both sides", async () => {
    const c = await startConversationCore(TENANT_A.id, alice, "bob");
    if (!c.ok) throw new Error();
    expect((await sendMessageCore(TENANT_A.id, alice, c.id, "hi bob")).ok).toBe(true);
    expect((await sendMessageCore(TENANT_A.id, bob, c.id, "hi alice")).ok).toBe(true);
    expect((await sendMessageCore(TENANT_A.id, alice, c.id, "   ")).ok).toBe(false); // empty

    const carol = await member(TENANT_A.id, "carol");
    expect((await sendMessageCore(TENANT_A.id, carol, c.id, "butting in")).ok).toBe(false);

    const thread = await getConversationThread(ctxA(), alice, c.id);
    expect(thread?.messages).toHaveLength(2);
    expect(thread?.messages[0]?.mine).toBe(true);
    expect(thread?.messages[1]?.mine).toBe(false);
  });

  it("tracks unread counts and clears on read", async () => {
    const c = await startConversationCore(TENANT_A.id, alice, "bob");
    if (!c.ok) throw new Error();
    await sendMessageCore(TENANT_A.id, bob, c.id, "you there?");
    await sendMessageCore(TENANT_A.id, bob, c.id, "ping");

    expect(await countUnreadMessages(ctxA(), alice)).toBe(2);
    expect(await countUnreadMessages(ctxA(), bob)).toBe(0); // sender's own don't count

    expect((await markReadCore(TENANT_A.id, alice, c.id)).ok).toBe(true);
    expect(await countUnreadMessages(ctxA(), alice)).toBe(0);

    const convos = await listConversations(ctxA(), alice);
    expect(convos).toHaveLength(1);
    expect(convos[0]?.otherName).toBe("bob");
    expect(convos[0]?.unread).toBe(0);
  });

  it("non-participant cannot read the thread", async () => {
    const c = await startConversationCore(TENANT_A.id, alice, "bob");
    if (!c.ok) throw new Error();
    const carol = await member(TENANT_A.id, "carol");
    expect(await getConversationThread(ctxA(), carol, c.id)).toBeNull();
  });

  it("does not leak across tenants", async () => {
    const c = await startConversationCore(TENANT_A.id, alice, "bob");
    if (!c.ok) throw new Error();
    await sendMessageCore(TENANT_A.id, alice, c.id, "secret");
    expect(await getConversationThread(makeTenantContext(TENANT_B.id), alice, c.id)).toBeNull();
    const bMember = await member(TENANT_B.id, "eve");
    expect(await listConversations(makeTenantContext(TENANT_B.id), bMember)).toHaveLength(0);
  });
});
