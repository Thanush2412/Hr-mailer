import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/login", "/api/auth/google-signin", "/api/auth/logout", "/api/auth/me"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return NextResponse.next();

  // Just check cookie presence — full JWT verification happens in API routes
  const token = req.cookies.get("hr_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
