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
      <main className="mx-auto mt-16 w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Set your password</h1>
        <p className="rounded border border-danger bg-surface p-3 text-sm text-fg-red-light">{peek.error}</p>
        <p className="text-sm text-text-secondary">
          <a href="/login" className="underline">Back to sign in</a>
        </p>
      </main>
    );
  }

  return <SetPasswordForm token={token ?? ""} email={peek.email} tenantName={tenant.name} />;
}
