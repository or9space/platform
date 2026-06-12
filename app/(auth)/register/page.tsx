import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/server/get-tenant";
import { registerAccountWithMembership } from "@/lib/actions/register";
import { AuthForm } from "../auth-form";

export default async function RegisterPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound(); // register only exists on tenant hosts

  const tenantId = tenant.id;

  async function registerAction(formData: FormData) {
    "use server";
    return await registerAccountWithMembership({
      tenantId,
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      username: String(formData.get("username") ?? ""),
    });
  }

  return <AuthForm mode="register" tenantName={tenant.name} registerAction={registerAction} />;
}
