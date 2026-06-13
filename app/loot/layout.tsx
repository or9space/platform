import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { isFeatureEnabled } from "@/lib/features";

export default async function LootLayout({ children }: { children: ReactNode }) {
  const ctx = await getFullTenantContext();
  if (!ctx || !isFeatureEnabled(ctx.features, "loot")) notFound();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800 p-4">
        <nav className="flex gap-6 text-sm">
          <a href="/loot" className="font-bold">Loot</a>
          <a href="/members" className="text-neutral-400 hover:text-neutral-100">Members</a>
          <a href="/forums" className="text-neutral-400 hover:text-neutral-100">Forums</a>
        </nav>
      </header>
      {children}
    </div>
  );
}
