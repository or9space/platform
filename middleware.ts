import { NextResponse, type NextRequest } from "next/server";
import { classifyHost } from "@/lib/host-classifier";

export function middleware(req: NextRequest) {
  const cls = classifyHost(req.headers.get("host"));

  // SECURITY: tenant identity is derived ONLY from the Host header (the edge's
  // single source of truth). The inbound x-or9-tenant / x-or9-host-kind headers
  // are stripped on every request before forwarding — a client could otherwise
  // forge x-or9-tenant to make getCurrentTenant() resolve another tenant, which
  // would poison app.tenant_id and defeat both the where-injection AND RLS
  // layers (they key off the same value). If a CF Worker ever needs to inject
  // tenant authoritatively, it must use a secret-signed header verified here.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-or9-tenant");
  requestHeaders.delete("x-or9-host-kind");

  if (cls.kind === "admin" || cls.kind === "support") {
    const url = req.nextUrl.clone();
    const prefix = cls.kind === "admin" ? "/admin-portal" : "/support-portal";
    // Don't double-rewrite API/auth routes
    if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith(prefix)) {
      url.pathname = `${prefix}${url.pathname === "/" ? "" : url.pathname}`;
      requestHeaders.set("x-or9-host-kind", cls.kind);
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    requestHeaders.set("x-or9-host-kind", cls.kind);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const slug = cls.kind === "tenant" ? cls.slug : null;
  if (slug) requestHeaders.set("x-or9-tenant", slug);
  requestHeaders.set("x-or9-host-kind", cls.kind);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|api/health).*)",
};
