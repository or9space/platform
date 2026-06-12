import { tenantSlugFromHost } from "./tenant-resolver";

export type HostClass =
  | { kind: "tenant"; slug: string }
  | { kind: "marketing" }
  | { kind: "admin" }
  | { kind: "support" };

const PLATFORM_ROOTS = ["or9.space", "localhost"];

function subdomainOf(host: string): string | null {
  const noPort = host.split(":")[0];
  for (const root of PLATFORM_ROOTS) {
    const suffix = "." + root;
    if (noPort.endsWith(suffix)) {
      const sub = noPort.slice(0, -suffix.length);
      if (sub && !sub.includes(".")) return sub;
    }
  }
  return null;
}

export function classifyHost(host: string | null | undefined): HostClass {
  if (!host) return { kind: "marketing" };
  const sub = subdomainOf(host);
  if (sub === "admin") return { kind: "admin" };
  if (sub === "support") return { kind: "support" };
  const slug = tenantSlugFromHost(host);
  if (slug) return { kind: "tenant", slug };
  return { kind: "marketing" };
}
