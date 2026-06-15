import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  createProjectCore, deleteProjectCore, createTicketCore,
  setTicketStatusCore, assignTicketCore, deleteTicketCore,
} from "@/lib/actions/projects-core";
import { listProjects, getProject } from "@/lib/queries/projects";
import { makeTenantContext } from "@/lib/tenant";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { testPrisma, seedTwoTenants, resetDb, closeDb, TENANT_A, TENANT_B } from "./setup";

const ctxA = () => makeTenantContext(TENANT_A.id);

describe("projects (boards + tickets)", () => {
  let officer: string;
  let enlisted: string;
  beforeEach(async () => {
    _resetRateLimitStore();
    await resetDb();
    await seedTwoTenants();
    const a = await testPrisma.account.create({ data: { email: "po@it-test.example" } });
    officer = (await testPrisma.membership.create({ data: { accountId: a.id, tenantId: TENANT_A.id, username: "po", tier: "OFFICER" } })).id;
    const b = await testPrisma.account.create({ data: { email: "pe@it-test.example" } });
    enlisted = (await testPrisma.membership.create({ data: { accountId: b.id, tenantId: TENANT_A.id, username: "pe", tier: "ENLISTED" } })).id;
  });
  afterAll(async () => { await resetDb(); await closeDb(); });

  it("officer creates a board; enlisted cannot", async () => {
    expect((await createProjectCore(TENANT_A.id, officer, "OFFICER", { name: "Roadmap" })).ok).toBe(true);
    expect((await createProjectCore(TENANT_A.id, enlisted, "ENLISTED", { name: "x" })).ok).toBe(false);
  });

  it("any member adds tickets; moves status; assigns by username", async () => {
    const p = await createProjectCore(TENANT_A.id, officer, "OFFICER", { name: "Board" });
    if (!p.ok) throw new Error();
    const t = await createTicketCore(TENANT_A.id, enlisted, { projectId: p.id, title: "Do the thing" });
    expect(t.ok).toBe(true);
    if (!t.ok) throw new Error();

    expect((await setTicketStatusCore(TENANT_A.id, enlisted, t.id, "IN_PROGRESS")).ok).toBe(true);
    expect((await setTicketStatusCore(TENANT_A.id, enlisted, t.id, "NONSENSE")).ok).toBe(false);
    expect((await assignTicketCore(TENANT_A.id, officer, t.id, "pe")).ok).toBe(true);
    expect((await assignTicketCore(TENANT_A.id, officer, t.id, "ghost")).ok).toBe(false);

    const detail = await getProject(ctxA(), p.id);
    expect(detail?.tickets).toHaveLength(1);
    expect(detail?.tickets[0]?.status).toBe("IN_PROGRESS");
    expect(detail?.tickets[0]?.assigneeUsername).toBe("pe");

    // unassign with null
    expect((await assignTicketCore(TENANT_A.id, officer, t.id, null)).ok).toBe(true);
    expect((await getProject(ctxA(), p.id))?.tickets[0]?.assigneeId).toBeNull();
  });

  it("creator or officer deletes a ticket; others cannot", async () => {
    const p = await createProjectCore(TENANT_A.id, officer, "OFFICER", { name: "Board C" });
    if (!p.ok) throw new Error();
    const t = await createTicketCore(TENANT_A.id, enlisted, { projectId: p.id, title: "Mine" });
    if (!t.ok) throw new Error();
    const x = await testPrisma.account.create({ data: { email: "px@it-test.example" } });
    const xm = (await testPrisma.membership.create({ data: { accountId: x.id, tenantId: TENANT_A.id, username: "px", tier: "ENLISTED" } })).id;
    expect((await deleteTicketCore(TENANT_A.id, xm, "ENLISTED", t.id)).ok).toBe(false);
    expect((await deleteTicketCore(TENANT_A.id, enlisted, "ENLISTED", t.id)).ok).toBe(true);
  });

  it("does not leak across tenants", async () => {
    const p = await createProjectCore(TENANT_A.id, officer, "OFFICER", { name: "Secret board" });
    if (!p.ok) throw new Error();
    expect(await getProject(makeTenantContext(TENANT_B.id), p.id)).toBeNull();
    expect(await listProjects(makeTenantContext(TENANT_B.id))).toHaveLength(0);
    expect((await deleteProjectCore(TENANT_A.id, officer, "OFFICER", p.id)).ok).toBe(true);
  });
});
