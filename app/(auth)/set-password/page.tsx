import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/server/get-tenant";
import { peekSetupToken } from "@/lib/actions/account-setup";
import { SetPasswordForm } from "../set-password-form";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  const { token } = await searchParams;
  const peek = await peekSetupToken(token ?? "");

  if (!peek.ok) {
    return (
      <main className="tenant-root bg-tactical-grid flex items-center justify-center p-6">
        <div className="w-full max-w-sm border border-border bg-surface p-6 mfd-cut-tl-br space-y-4">
          <h1 className="text-stencil text-2xl text-text-primary">Set your password</h1>
          <p className="text-fg-red-light text-sm">{peek.error}</p>
          <p className="text-sm">
            <a href="/login" className="text-text-secondary hover:text-text-primary underline text-sm">Back to sign in</a>
          </p>
        </div>
      </main>
    );
  }

  return <SetPasswordForm token={token ?? ""} email={peek.email} tenantName={tenant.name} />;
}
