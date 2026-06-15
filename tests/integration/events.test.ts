import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  createEventCore, rsvpEventCore, updateEventCore, deleteEventCore,
} from "@/lib/actions/events-core";
import { listUpcomingEvents, getEvent, getMyRsvp } from "@/lib/queries/events";
import { makeTenantContext } from "@/lib/tenant";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();
const ctxA = () => makeTenantContext(TENANT_A.id);

describe("events", () => {
  let officer: string;
  let enlisted: string;

  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    await seedTwoTenants();
    const accO = await testPrisma.account.create({ data: { email: "evo@it-test.example" } });
    officer = (await testPrisma.membership.create({
      data: { accountId: accO.id, tenantId: TENANT_A.id, username: "officer", tier: "OFFICER" },
    })).id;
    const accE = await testPrisma.account.create({ data: { email: "eve@it-test.example" } });
    enlisted = (await testPrisma.membership.create({
      data: { accountId: accE.id, tenantId: TENANT_A.id, username: "enlistee", tier: "ENLISTED" },
    })).id;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("officer creates an event; enlisted cannot", async () => {
    const ok = await createEventCore(TENANT_A.id, officer, "OFFICER", { title: "Op Night", type: "OP", startsAt: future });
    expect(ok.ok).toBe(true);
    const bad = await createEventCore(TENANT_A.id, enlisted, "ENLISTED", { title: "Nope", type: "OP", startsAt: future });
    expect(bad.ok).toBe(false);
  });

  it("rejects an end time before the start", async () => {
    const r = await createEventCore(TENANT_A.id, officer, "OFFICER", {
      title: "Bad window", type: "OP", startsAt: future, endsAt: past,
    });
    expect(r.ok).toBe(false);
  });

  it("members RSVP and counts reflect the latest choice", async () => {
    const r = await createEventCore(TENANT_A.id, officer, "OFFICER", { title: "Drill", type: "TRAINING", startsAt: future });
    if (!r.ok) throw new Error("create failed");
    const id = r.eventId;
    expect((await rsvpEventCore(TENANT_A.id, enlisted, { eventId: id, status: "GOING" })).ok).toBe(true);
    expect((await rsvpEventCore(TENANT_A.id, officer, { eventId: id, status: "MAYBE" })).ok).toBe(true);
    // enlisted flips MAYBE then back to GOING — upsert, not duplicate
    await rsvpEventCore(TENANT_A.id, enlisted, { eventId: id, status: "MAYBE" });
    await rsvpEventCore(TENANT_A.id, enlisted, { eventId: id, status: "GOING" });

    const ev = await getEvent(ctxA(), id);
    expect(ev?.counts.GOING).toBe(1);
    expect(ev?.counts.MAYBE).toBe(1);
    expect(ev?.rsvps).toHaveLength(2);
    expect(await getMyRsvp(ctxA(), id, enlisted)).toBe("GOING");
  });

  it("upcoming list excludes past events", async () => {
    await createEventCore(TENANT_A.id, officer, "OFFICER", { title: "Future", type: "OP", startsAt: future });
    await createEventCore(TENANT_A.id, officer, "OFFICER", { title: "Past", type: "OP", startsAt: past });
    const up = await listUpcomingEvents(ctxA(), 50);
    const titles = up.map((e) => e.title);
    expect(titles).toContain("Future");
    expect(titles).not.toContain("Past");
  });

  it("does not leak events across tenants", async () => {
    const r = await createEventCore(TENANT_A.id, officer, "OFFICER", { title: "Secret A", type: "OP", startsAt: future });
    if (!r.ok) throw new Error("create failed");
    expect(await getEvent(makeTenantContext(TENANT_B.id), r.eventId)).toBeNull();
    expect(await listUpcomingEvents(makeTenantContext(TENANT_B.id), 50)).toHaveLength(0);
  });

  it("officer updates and deletes; enlisted cannot delete", async () => {
    const r = await createEventCore(TENANT_A.id, officer, "OFFICER", { title: "Edit me", type: "OP", startsAt: future });
    if (!r.ok) throw new Error("create failed");
    const id = r.eventId;
    expect((await updateEventCore(TENANT_A.id, officer, "OFFICER", id, { title: "Edited", type: "MEETING", startsAt: future })).ok).toBe(true);
    expect((await getEvent(ctxA(), id))?.title).toBe("Edited");
    expect((await deleteEventCore(TENANT_A.id, enlisted, "ENLISTED", id)).ok).toBe(false);
    expect((await deleteEventCore(TENANT_A.id, officer, "OFFICER", id)).ok).toBe(true);
    expect(await getEvent(ctxA(), id)).toBeNull();
  });
});
