import { NextResponse } from "next/server"

export type ErrorCode = "bad_request" | "unauthorized" | "forbidden" | "not_found" | "validation_error" | "internal_error"

export function errorResponse(status: 400 | 401 | 403 | 404 | 422 | 500, code: ErrorCode, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status })
}

export function logApiError(route: string, error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({ level: "error", route, message, context: context ?? {} }))
}
