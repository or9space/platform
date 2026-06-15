import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { updateProfileCore } from "@/lib/actions/profile-core";
import { createSquadCore, addSquadMemberCore, removeSquadMemberCore, deleteSquadCore } from "@/lib/actions/squads-core";
import { listSquadsWithMembers } from "@/lib/queries/squads";
import { createNewsCore } from "@/lib/actions/news-core";
import { getActivityFeed } from "@/lib/queries/activity";
import { featureDefaultsForPlan } from "@/lib/config/apply-defaults";
import { makeTenantContext } from "@/lib/tenant";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = () => makeTenantContext(TENANT_A.id);
const ALL = featureDefaultsForPlan("PAID");

describe("settings / squads / activity", () => {
  let officer: string;
  let enlisted: string;
  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    await seedTwoTenants();
    const a = await testPrisma.account.create({ data: { email: "so@it-test.example" } });
    officer = (await testPrisma.membership.create({ data: { accountId: a.id, tenantId: TENANT_A.id, username: "so", tier: "OFFICER" } })).id;
    const b = await testPrisma.account.create({ data: { email: "se@it-test.example" } });
    enlisted = (await testPrisma.membership.create({ data: { accountId: b.id, tenantId: TENANT_A.id, username: "se", tier: "ENLISTED" } })).id;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("profile: a member edits their own display name + bio", async () => {
    const r = await updateProfileCore(TENANT_A.id, enlisted, { displayName: "Ace Pilot", bio: "Veteran", avatarUrl: "https://img.example/a.png" });
    expect(r.ok).toBe(true);
    const m = await testPrisma.membership.findUnique({ where: { id: enlisted } });
    expect(m?.displayName).toBe("Ace Pilot");
    expect(m?.bio).toBe("Veteran");
    expect(m?.avatarUrl).toBe("https://img.example/a.png");
  });

  it("profile: rejects a bad avatar URL", async () => {
    const r = await updateProfileCore(TENANT_A.id, enlisted, { avatarUrl: "not-a-url" });
    expect(r.ok).toBe(false);
  });

  it("squads: officer creates + adds members by username + removes; enlisted blocked; isolation", async () => {
    expect((await createSquadCore(TENANT_A.id, enlisted, "ENLISTED", { name: "x" })).ok).toBe(false);
    const r = await createSquadCore(TENANT_A.id, officer, "OFFICER", { name: "Alpha" });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect((await addSquadMemberCore(TENANT_A.id, officer, "OFFICER", { squadId: r.id, username: "se", role: "Lead" })).ok).toBe(true);
    expect((await addSquadMemberCore(TENANT_A.id, officer, "OFFICER", { squadId: r.id, username: "ghost" })).ok).toBe(false);
    let squads = await listSquadsWithMembers(ctxA());
    expect(squads[0]?.members).toHaveLength(1);
    expect(squads[0]?.members[0]?.role).toBe("Lead");
    expect((await removeSquadMemberCore(TENANT_A.id, officer, "OFFICER", r.id, enlisted)).ok).toBe(true);
    squads = await listSquadsWithMembers(ctxA());
    expect(squads[0]?.members).toHaveLength(0);
    expect(await listSquadsWithMembers(makeTenantContext(TENANT_B.id))).toHaveLength(0);
    expect((await deleteSquadCore(TENANT_A.id, officer, "OFFICER", r.id)).ok).toBe(true);
  });

  it("activity: feed surfaces recent content and is tenant-scoped", async () => {
    await createNewsCore(TENANT_A.id, officer, "OFFICER", { title: "Big news", body: "b", category: "ANNOUNCEMENT" });
    const feed = await getActivityFeed(ctxA(), ALL, 40);
    expect(feed.some((e) => e.kind === "News" && e.title === "Big news")).toBe(true);
    expect(await getActivityFeed(makeTenantContext(TENANT_B.id), ALL, 40)).toHaveLength(0);
  });
});
