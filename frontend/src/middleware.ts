import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and auth routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/auth") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Check for supabase auth cookie — any cookie with auth-token in the name
  const cookies = request.cookies.getAll();
  const hasSession = cookies.some(
    (c) => c.name.includes("auth-token") && c.value.length > 0
  );

  console.log(`[middleware] path=${pathname} hasSession=${hasSession}`);

  const protectedPrefixes = ["/dashboard", "/test", "/results", "/admin"];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (isProtected && !hasSession) {
    console.log(`[middleware] blocking ${pathname} — no session cookie`);
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
