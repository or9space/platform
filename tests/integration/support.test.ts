import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createTicketCore, replyTicketCore, closeTicketCore } from "@/lib/support-core";
import { testPrisma, resetDb, closeDb } from "./setup";
import { _resetRateLimitStore } from "@/lib/rate-limit";

describe("support tickets", () => {
  let accountId: string;
  let otherAccountId: string;

  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    accountId = (await testPrisma.account.create({ data: { email: "u@it-test.example" } })).id;
    otherAccountId = (await testPrisma.account.create({ data: { email: "o@it-test.example" } })).id;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("creates a ticket with first message", async () => {
    const r = await createTicketCore(accountId, { subject: "Help", body: "It broke", tenantContextId: null });
    expect(r.ok).toBe(true);
    const ticket = await testPrisma.supportTicket.findFirst({ where: { accountId }, include: { messages: true } });
    expect(ticket?.messages.length).toBe(1);
    expect(ticket?.status).toBe("OPEN");
  });

  it("rate limits at 5 tickets/day per account", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await createTicketCore(accountId, { subject: `t${i}`, body: "b", tenantContextId: null });
      expect(r.ok).toBe(true);
    }
    const sixth = await createTicketCore(accountId, { subject: "t6", body: "b", tenantContextId: null });
    expect(sixth.ok).toBe(false);
  });

  it("owner can reply; stranger cannot", async () => {
    const r = await createTicketCore(accountId, { subject: "Help", body: "x", tenantContextId: null });
    if (!r.ok) throw new Error("create failed");
    const ownerReply = await replyTicketCore(accountId, { ticketId: r.ticketId, body: "more info", isAdmin: false });
    expect(ownerReply.ok).toBe(true);
    const strangerReply = await replyTicketCore(otherAccountId, { ticketId: r.ticketId, body: "hi", isAdmin: false });
    expect(strangerReply.ok).toBe(false);
  });

  it("admin reply flips status to ANSWERED; close flips to CLOSED", async () => {
    const r = await createTicketCore(accountId, { subject: "Help", body: "x", tenantContextId: null });
    if (!r.ok) throw new Error("create failed");
    await replyTicketCore(otherAccountId, { ticketId: r.ticketId, body: "fixed it", isAdmin: true });
    let t = await testPrisma.supportTicket.findUnique({ where: { id: r.ticketId } });
    expect(t?.status).toBe("ANSWERED");
    await closeTicketCore(accountId, r.ticketId, false);
    t = await testPrisma.supportTicket.findUnique({ where: { id: r.ticketId } });
    expect(t?.status).toBe("CLOSED");
  });
});
