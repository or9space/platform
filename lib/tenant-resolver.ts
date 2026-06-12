const RESERVED_SUBDOMAINS = new Set(["www", "admin", "support", "api", "demo-staging"]);
const PLATFORM_ROOTS = ["or9.space", "localhost"];

export function tenantSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const noPort = host.split(":")[0];
  for (const root of PLATFORM_ROOTS) {
    if (noPort === root || noPort === "www." + root) return null;
    const suffix = "." + root;
    if (noPort.endsWith(suffix)) {
      const sub = noPort.slice(0, -suffix.length);
      if (!sub) return null;
      if (RESERVED_SUBDOMAINS.has(sub)) return null;
      if (sub.includes(".")) return null;
      return sub;
    }
  }
  return null;
}
