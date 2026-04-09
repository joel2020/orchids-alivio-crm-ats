import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { companiesSchema } from "@/lib/api/schemas"
import { parsePaginationParams } from "@/lib/api/pagination"
import { errorResponse, logApiError } from "@/lib/api/http"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")
  const status = searchParams.get("status")
  const validStatuses = new Set(["prospect", "active", "dormant", "lost"])

  let pagination
  try {
    pagination = parsePaginationParams(searchParams)
  } catch (error) {
    return errorResponse(400, "bad_request", (error as Error).message)
  }

  let query = supabase
    .from("companies")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to)
  if (search) query = query.ilike("name", `%${search}%`)
  if (status) {
    if (!validStatuses.has(status)) return errorResponse(400, "bad_request", "Invalid status filter")
    query = query.eq("status", status)
  }

  const { data, error } = await query
  if (error) {
    logApiError("/api/companies", error)
    return errorResponse(400, "bad_request", "Failed to fetch companies")
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "bizdev")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const parsed = companiesSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse(422, "validation_error", "Validation failed", parsed.error.flatten())
  }

  const { data, error } = await supabase.from("companies").insert({ ...parsed.data, account_id: accountId }).select("*").single()
  if (error) {
    logApiError("/api/companies", error)
    return errorResponse(400, "bad_request", "Failed to create company")
  }
  return NextResponse.json(data, { status: 201 })
}
