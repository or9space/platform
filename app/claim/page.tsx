import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/server/get-tenant";
import { ClaimForm } from "./claim-form";

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const tenant = await getCurrentTenant();
  const { token } = await searchParams;
  if (!tenant || !token) notFound();

  return (
    <main className="mx-auto mt-16 w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Claim {tenant.name}</h1>
      <p className="text-sm text-text-secondary">
        You are creating the founding admin account for <code>{tenant.slug}.or9.space</code>.
      </p>
      <ClaimForm tenantSlug={tenant.slug} token={token} />
    </main>
  );
}
