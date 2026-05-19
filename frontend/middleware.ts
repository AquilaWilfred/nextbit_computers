import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/b2b", "/dashboard", "/admin"];
const PUBLIC_B2B = ["/b2b/registration"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip public b2b pages
  if (PUBLIC_B2B.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("nextbit_token")?.value;
  if (!token) {
    const loginUrl = new URL("/auth", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/b2b/:path*", "/dashboard/:path*", "/admin/:path*"],
};
