import { NextResponse } from "next/server"

type ErrorOptions = {
  status?: number
  details?: unknown
}

type PaginationOptions = {
  defaultLimit?: number
  maxLimit?: number
}

export function logApiError(route: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[api:${route}]`, {
    error,
    ...(context ?? {}),
  })
}

export function errorResponse(message: string, options: ErrorOptions = {}) {
  const { status = 400, details } = options
  return NextResponse.json(
    {
      error: message,
      ...(details !== undefined ? { details } : {}),
    },
    { status }
  )
}

export function dataResponse<T>(data: T, init?: { status?: number; pagination?: Record<string, unknown> }) {
  return NextResponse.json(
    {
      data,
      ...(init?.pagination ? { pagination: init.pagination } : {}),
    },
    { status: init?.status ?? 200 }
  )
}

export function parsePagination(searchParams: URLSearchParams, options: PaginationOptions = {}) {
  const defaultLimit = options.defaultLimit ?? 20
  const maxLimit = options.maxLimit ?? 200

  const pageValue = Number.parseInt(searchParams.get("page") ?? "1", 10)
  const limitValue = Number.parseInt(searchParams.get("limit") ?? `${defaultLimit}`, 10)

  const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1
  const rawLimit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : defaultLimit
  const limit = Math.min(rawLimit, maxLimit)
  const offset = (page - 1) * limit

  return { page, limit, offset }
}
