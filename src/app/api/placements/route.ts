import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { placementsSchema } from "@/lib/api/schemas"
import { parsePaginationParams } from "@/lib/api/pagination"
import { errorResponse, logApiError } from "@/lib/api/http"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("placement_status")
  const validStatuses = new Set(["pending", "active", "guaranteed", "completed", "falloff"])
  let pagination
  try {
    pagination = parsePaginationParams(searchParams)
  } catch (error) {
    return errorResponse(400, "bad_request", (error as Error).message)
  }

  let query = supabase
    .from("placements")
    .select("*, candidates(*), companies(*), job_orders(*)")
    .eq("account_id", accountId)
    .order("start_date", { ascending: false })
    .range(pagination.from, pagination.to)

  if (status) {
    if (!validStatuses.has(status)) return errorResponse(400, "bad_request", "Invalid placement_status filter")
    query = query.eq("placement_status", status)
  }

  const { data, error } = await query
  if (error) {
    logApiError("/api/placements", error)
    return errorResponse(400, "bad_request", "Failed to fetch placements")
  }

  const totals = {
    total_fee: (data ?? []).reduce((sum, row) => sum + Number(row.fee ?? 0), 0),
    total_revenue: (data ?? []).reduce((sum, row) => sum + Number(row.revenue ?? 0), 0),
  }

  return NextResponse.json({ data, totals })
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const parsed = placementsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse(422, "validation_error", "Validation failed", parsed.error.flatten())
  }

  if (parsed.data.revenue < 0 || parsed.data.fee < 0) {
    return errorResponse(400, "bad_request", "fee and revenue must be non-negative")
  }

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, candidate_id, job_order_id")
    .eq("account_id", accountId)
    .eq("id", parsed.data.submission_id)
    .single()

  if (!submission) {
    return errorResponse(400, "bad_request", "submission_id must reference an existing submission")
  }

  const { data, error } = await supabase
    .from("placements")
    .insert({ ...parsed.data, account_id: accountId })
    .select("*")
    .single()

  if (error) {
    logApiError("/api/placements", error)
    return errorResponse(400, "bad_request", "Failed to create placement")
  }
  return NextResponse.json(data, { status: 201 })
}
