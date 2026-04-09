import { NextRequest } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { submissionsSchema } from "@/lib/api/schemas"
import { dataResponse, errorResponse, logApiError, parsePagination } from "@/lib/api/http"
import type { Database } from "@/lib/database.types"

type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"]
type SubmissionInsert = Database["public"]["Tables"]["submissions"]["Insert"]
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"]

type SubmissionListItem = SubmissionRow & {
  candidates?: Record<string, unknown> | null
  job_orders?: Record<string, unknown> | null
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const { page, limit, offset } = parsePagination(searchParams, { defaultLimit: 50, maxLimit: 200 })

  const { data, error, count } = await supabase
    .from("submissions")
    .select("*, candidates(*), job_orders(*)", { count: "exact" })
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<SubmissionListItem[]>()

  if (error) {
    logApiError("submissions.GET", error, { accountId })
    return errorResponse(error.message)
  }

  return dataResponse(data ?? [], {
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId, user } = auth.context!

  const parsed = submissionsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse("Validation failed", { status: 422, details: parsed.error.flatten() })
  }

  const payload: SubmissionInsert = { ...parsed.data, account_id: accountId }
  const { data, error } = await supabase.from("submissions").insert(payload).select("*").returns<SubmissionRow[]>().single()

  if (error) {
    logApiError("submissions.POST", error, { accountId })
    return errorResponse(error.message)
  }

  const taskPayload: TaskInsert = {
    account_id: accountId,
    entity_type: "submission",
    entity_id: data.id,
    title: "Follow up with client on submitted candidate",
    status: "open",
    priority: "high",
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10),
    assignee_user_id: user.id,
  }

  await supabase.from("tasks").insert(taskPayload)

  return dataResponse(data, { status: 201 })
}
