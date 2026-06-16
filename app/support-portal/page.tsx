import { getSessionAccountId } from "@/lib/auth";
import { prismaGlobal } from "@/lib/db";
import { TicketForm } from "./ticket-form";

export default async function SupportHome({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return (
      <p className="text-text-secondary">
        Sign in to open a ticket: <a className="underline" href="/login-direct">sign in here</a>.
      </p>
    );
  }
  const { tenant } = await searchParams;
  const tenantRow = tenant
    ? await prismaGlobal.tenant.findUnique({ where: { slug: tenant } })
    : null;
  const myTickets = await prismaGlobal.supportTicket.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-3 text-2xl font-bold">Open a ticket</h1>
        <TicketForm tenantContextId={tenantRow?.id ?? null} />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Your tickets</h2>
        {myTickets.length === 0 && <p className="text-text-secondary">None yet.</p>}
        <ul className="divide-y divide-border">
          {myTickets.map((t) => (
            <li key={t.id} className="py-2">
              <a href={`/tickets/${t.id}`} className="hover:underline">{t.subject}</a>
              <span className="ml-2 text-xs text-text-muted">{t.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
