// src/app/proxy.ts
// Replaces deprecated middleware.ts convention
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // deja pasar login y assets
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("conviaq_session")?.value;

  // protege portal
  if (pathname.startsWith("/portal")) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
  }

  // protege API (except login)
  if (pathname.startsWith("/api")) {
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/api/:path*"],
};
