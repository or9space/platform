import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { TenantPublicNav } from "@/components/tenant/public-nav";
import { LoginTerminal } from "../login-terminal";

export const metadata: Metadata = { title: "Sign In" };

export default async function LoginPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();

  // Discord OAuth is gated on a provider + creds that don't exist yet (a future
  // platform phase). Show the Discord button only once they're configured.
  const discordEnabled = !!process.env.AUTH_DISCORD_ID;

  return (
    <div className="tenant-root">
      <TenantPublicNav brandName={ctx.config.branding.name} logoUrl={ctx.config.branding.logoUrl} />
      <main>
        <LoginTerminal logoUrl={ctx.config.branding.logoUrl} discordEnabled={discordEnabled} />
      </main>
    </div>
  );
}
