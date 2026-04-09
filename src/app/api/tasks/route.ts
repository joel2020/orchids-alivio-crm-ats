import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { tasksSchema } from "@/lib/api/schemas"
import { parsePaginationParams } from "@/lib/api/pagination"
import { errorResponse, logApiError } from "@/lib/api/http"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const assignee = searchParams.get("assignee_user_id")
  const staleOnly = searchParams.get("stale") === "true"
  const validStatuses = new Set(["open", "in_progress", "done"])
  let pagination
  try {
    pagination = parsePaginationParams(searchParams)
  } catch (error) {
    return errorResponse(400, "bad_request", (error as Error).message)
  }

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to)

  if (status) {
    if (!validStatuses.has(status)) return errorResponse(400, "bad_request", "Invalid status filter")
    query = query.eq("status", status)
  }
  if (assignee) query = query.eq("assignee_user_id", assignee)

  if (staleOnly) {
    query = query.lt("due_date", new Date().toISOString().slice(0, 10)).neq("status", "done")
  }

  const { data, error } = await query
  if (error) {
    logApiError("/api/tasks", error)
    return errorResponse(400, "bad_request", "Failed to fetch tasks")
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId, user } = auth.context!

  const parsed = tasksSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse(422, "validation_error", "Validation failed", parsed.error.flatten())
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...parsed.data, account_id: accountId, assignee_user_id: user.id })
    .select("*")
    .single()

  if (error) {
    logApiError("/api/tasks", error)
    return errorResponse(400, "bad_request", "Failed to create task")
  }
  return NextResponse.json(data, { status: 201 })
}
