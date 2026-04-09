import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { jobOrdersSchema } from "@/lib/api/schemas"
import { parsePaginationParams } from "@/lib/api/pagination"
import { errorResponse, logApiError } from "@/lib/api/http"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get("company_id")
  const status = searchParams.get("status")
  const validStatuses = new Set(["intake", "open", "on_hold", "filled", "closed"])
  let pagination
  try {
    pagination = parsePaginationParams(searchParams)
  } catch (error) {
    return errorResponse(400, "bad_request", (error as Error).message)
  }

  let query = supabase
    .from("job_orders")
    .select("*, companies(*)")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to)
  if (companyId) query = query.eq("company_id", companyId)
  if (status) {
    if (!validStatuses.has(status)) return errorResponse(400, "bad_request", "Invalid status filter")
    query = query.eq("status", status)
  }

  const { data, error } = await query
  if (error) {
    logApiError("/api/job_orders", error)
    return errorResponse(400, "bad_request", "Failed to fetch job orders")
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "bizdev")
  if (auth.response) return auth.response
  const { supabase, accountId, user } = auth.context!

  const parsed = jobOrdersSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse(422, "validation_error", "Validation failed", parsed.error.flatten())
  }

  const { data, error } = await supabase.from("job_orders").insert({ ...parsed.data, account_id: accountId }).select("*").single()
  if (error) {
    logApiError("/api/job_orders", error)
    return errorResponse(400, "bad_request", "Failed to create job order")
  }

  await supabase.from("tasks").insert({
    account_id: accountId,
    entity_type: "job_order",
    entity_id: data.id,
    title: "Kickoff intake call",
    status: "open",
    priority: "high",
    assignee_user_id: user.id,
    due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  })

  return NextResponse.json(data, { status: 201 })
}
