import { NextResponse, type NextRequest } from "next/server";
import { tenantSlugFromHost } from "@/lib/tenant-resolver";

export function middleware(req: NextRequest) {
  const cfTenant = req.headers.get("x-or9-tenant");
  const slug = cfTenant?.trim() || tenantSlugFromHost(req.headers.get("host"));

  const res = NextResponse.next();
  if (slug) res.headers.set("x-or9-tenant", slug);
  return res;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|api/health).*)",
};
