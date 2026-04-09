import { NextResponse, type NextRequest } from "next/server"

function hasAuthToken(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ") && authHeader.length > 20) {
    return true
  }

  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"))
}

function isPublicApiPath(pathname: string): boolean {
  return pathname === "/api/instantly/webhook"
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isDashboardRoute = pathname.startsWith("/(dashboard)") || [
    "/dashboard",
    "/applications",
    "/activities",
    "/candidates",
    "/clients",
    "/contacts",
    "/interviews",
    "/jobs",
    "/opportunities",
    "/pipeline",
    "/projects",
    "/settings",
    "/tasks",
    "/instantly",
  ].some((route) => pathname === route || pathname.startsWith(`${route}/`))

  const isProtectedApiRoute = pathname.startsWith("/api/") && !isPublicApiPath(pathname)

  if (!isDashboardRoute && !isProtectedApiRoute) {
    return NextResponse.next()
  }

  if (hasAuthToken(request)) {
    return NextResponse.next()
  }

  if (isProtectedApiRoute) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const signInUrl = new URL("/auth/sign-in", request.url)
  signInUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(signInUrl)
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/applications/:path*", "/activities/:path*", "/candidates/:path*", "/clients/:path*", "/contacts/:path*", "/interviews/:path*", "/jobs/:path*", "/opportunities/:path*", "/pipeline/:path*", "/projects/:path*", "/settings/:path*", "/tasks/:path*", "/instantly/:path*"],
}
