import { auth } from "@/lib/auth";
import { prismaGlobal } from "@/lib/db";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export default async function AdminHome() {
  // The layout renders the admin wall for non-admins, but this page still
  // executes as a server component — without this guard its count queries run
  // and the results leak into the RSC flight payload. Return null so the
  // queries never run for non-admins; the layout's wall is what shows.
  const session = await auth();
  const accountId = (session as { accountId?: string } | null)?.accountId;
  const account = accountId
    ? await prismaGlobal.account.findUnique({ where: { id: accountId } })
    : null;
  if (!account || !isPlatformAdminEmail(account.email)) return null;

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
