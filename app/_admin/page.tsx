import { prismaGlobal } from "@/lib/db";

export default async function AdminHome() {
  const [pendingCount, tenantCount, openTickets] = await Promise.all([
    prismaGlobal.pendingTenant.count({ where: { status: "PENDING" } }),
    prismaGlobal.tenant.count({ where: { status: "LIVE" } }),
    prismaGlobal.supportTicket.count({ where: { status: "OPEN" } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Platform overview</h1>
      <ul className="space-y-1 text-neutral-300">
        <li>Live tenants: {tenantCount}</li>
        <li><a className="underline" href="/tenants/pending">Pending sign-ups: {pendingCount}</a></li>
        <li><a className="underline" href="/support">Open support tickets: {openTickets}</a></li>
      </ul>
    </div>
  );
}
