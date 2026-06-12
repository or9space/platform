import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/server/get-tenant";
import { AuthForm } from "../auth-form";

export default async function LoginPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();
  return <AuthForm mode="login" tenantName={tenant.name} />;
}
