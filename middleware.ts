import { NextResponse, type NextRequest } from "next/server";
import { classifyHost } from "@/lib/host-classifier";

export function middleware(req: NextRequest) {
  const cfTenant = req.headers.get("x-or9-tenant");
  const cls = classifyHost(req.headers.get("host"));

  if (cls.kind === "admin" || cls.kind === "support") {
    const url = req.nextUrl.clone();
    const prefix = cls.kind === "admin" ? "/admin-portal" : "/support-portal";
    // Don't double-rewrite API/auth routes
    if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith(prefix)) {
      url.pathname = `${prefix}${url.pathname === "/" ? "" : url.pathname}`;
      const res = NextResponse.rewrite(url);
      res.headers.set("x-or9-host-kind", cls.kind);
      return res;
    }
    const res = NextResponse.next();
    res.headers.set("x-or9-host-kind", cls.kind);
    return res;
  }

  const slug = cfTenant?.trim() || (cls.kind === "tenant" ? cls.slug : null);
  const requestHeaders = new Headers(req.headers);
  if (slug) requestHeaders.set("x-or9-tenant", slug);
  requestHeaders.set("x-or9-host-kind", cls.kind);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|api/health).*)",
};
