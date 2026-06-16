import { prismaGlobal } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export default async function AdminSupportPage() {
  await requirePlatformAdmin();
  const tickets = await prismaGlobal.supportTicket.findMany({
    where: { status: { not: "CLOSED" } },
    orderBy: { createdAt: "asc" },
    include: { account: { select: { email: true } } },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Support queue</h1>
      {tickets.length === 0 && <p className="text-text-secondary">Queue is empty.</p>}
      <ul className="divide-y divide-border">
        {tickets.map((t) => (
          <li key={t.id} className="py-2">
            <a href={`/support/${t.id}`} className="hover:underline">{t.subject}</a>
            <span className="ml-2 text-xs text-text-muted">{t.status} · {t.account.email}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
