import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { env } from "@/lib/env"
import type { Database } from "@/lib/database.types"

export type AppRole = "admin" | "recruiter" | "bizdev" | "sourcer" | "readonly"

const ROLE_WEIGHTS: Record<AppRole, number> = {
  readonly: 1,
  sourcer: 2,
  bizdev: 2,
  recruiter: 3,
  admin: 4,
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function extractTokenFromSupabaseCookie(rawValue: string): string | null {
  try {
    const decoded = decodeURIComponent(rawValue)
    const parsed = JSON.parse(decoded)

    if (Array.isArray(parsed)) {
      const maybeToken = parsed[0]
      if (typeof maybeToken === "string" && maybeToken.length > 20) {
        return maybeToken
      }
    }

    if (typeof parsed === "object" && parsed && "access_token" in parsed) {
      const token = (parsed as { access_token?: unknown }).access_token
      if (typeof token === "string" && token.length > 20) {
        return token
      }
    }
  } catch {
    // ignore malformed cookie payloads
  }

  return null
}

export function extractAccessTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }

  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith("sb-") || !cookie.name.endsWith("-auth-token")) {
      continue
    }

    const token = extractTokenFromSupabaseCookie(cookie.value)
    if (token) {
      return token
    }
  }

  return null
}

export async function extractAccessTokenFromCookieStore(): Promise<string | null> {
  const cookieStore = await cookies()
  for (const cookie of cookieStore.getAll()) {
    if (!cookie.name.startsWith("sb-") || !cookie.name.endsWith("-auth-token")) {
      continue
    }

    const token = extractTokenFromSupabaseCookie(cookie.value)
    if (token) {
      return token
    }
  }

  return null
}

export function resolveUserRole(user: User): AppRole {
  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role === "admin" || role === "recruiter" || role === "bizdev" || role === "sourcer" || role === "readonly") {
    return role
  }

  return "recruiter"
}

export function resolveAccountId(user: User): string | null {
  const accountId = user.app_metadata?.account_id ?? user.user_metadata?.account_id
  return typeof accountId === "string" && accountId.length > 0 ? accountId : null
}

export function hasRequiredRole(actualRole: AppRole, requiredRole: AppRole): boolean {
  return ROLE_WEIGHTS[actualRole] >= ROLE_WEIGHTS[requiredRole]
}

export type AuthContext = {
  accessToken: string
  accountId: string
  role: AppRole
  user: User
  supabase: SupabaseClient<Database>
}

export async function requireApiAuth(
  request: NextRequest,
  requiredRole: AppRole = "readonly"
): Promise<{ context?: AuthContext; response?: NextResponse }> {
  const accessToken = extractAccessTokenFromRequest(request)
  if (!accessToken) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken)

  if (error || !user) {
    return {
      response: NextResponse.json({ error: "Invalid auth session" }, { status: 401 }),
    }
  }

  const role = resolveUserRole(user)
  if (!hasRequiredRole(role, requiredRole)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  const accountId = resolveAccountId(user)
  if (!accountId) {
    return {
      response: NextResponse.json({ error: "Missing account scope" }, { status: 403 }),
    }
  }

  return {
    context: {
      accessToken,
      accountId,
      role,
      user,
      supabase,
    },
  }
}
