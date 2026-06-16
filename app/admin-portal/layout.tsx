import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { prismaGlobal } from "@/lib/db";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const accountId = (session as any)?.accountId as string | undefined;
  const account = accountId
    ? await prismaGlobal.account.findUnique({ where: { id: accountId } })
    : null;

  if (!account || !isPlatformAdminEmail(account.email)) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-2xl font-bold">or9.space admin</h1>
          <p className="text-text-secondary">
            Platform admin only. Sign in with an admin account at
            <a className="mx-1 underline" href="/login-direct">admin.or9.space/login-direct</a>
            — admin sessions are host-scoped.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border p-4">
        <nav className="flex gap-6 text-sm">
          <a href="/" className="font-bold">or9 admin</a>
          <a href="/tenants/pending" className="text-text-secondary hover:text-text-primary">Pending tenants</a>
          <a href="/support" className="text-text-secondary hover:text-text-primary">Support</a>
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
