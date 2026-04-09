import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { candidatesSchema } from "@/lib/api/schemas"
import { parsePaginationParams } from "@/lib/api/pagination"
import { errorResponse, logApiError } from "@/lib/api/http"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("candidate_status")
  const jobOrderId = searchParams.get("job_order_id")
  const allowedStatus = new Set(["new", "screening", "qualified", "submitted", "interviewing", "offer", "placed", "rejected", "nurture"])

  let pagination
  try {
    pagination = parsePaginationParams(searchParams)
  } catch (error) {
    return errorResponse(400, "bad_request", (error as Error).message)
  }

  let query = supabase
    .from("candidates")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to)

  if (status) {
    if (!allowedStatus.has(status)) {
      return errorResponse(400, "bad_request", "Invalid candidate_status filter")
    }
    query = query.eq("candidate_status", status)
  }

  const { data, error } = await query
  if (error) {
    logApiError("/api/candidates", error)
    return errorResponse(400, "bad_request", "Failed to fetch candidates")
  }

  if (!jobOrderId) return NextResponse.json(data)

  const { data: jobOrder } = await supabase
    .from("job_orders")
    .select("id, location, department")
    .eq("account_id", accountId)
    .eq("id", jobOrderId)
    .single()

  const candidateIds = (data ?? []).map((c) => c.id)
  const { data: preferences } = candidateIds.length
    ? await supabase.from("candidate_preferences").select("candidate_id, preferred_states, preferred_specialties").in("candidate_id", candidateIds)
    : { data: [] }

  const preferenceMap = new Map((preferences ?? []).map((pref) => [pref.candidate_id, pref]))
  const ranked = (data ?? []).map((candidate) => {
    const pref = preferenceMap.get(candidate.id)
    let score = 0
    if (jobOrder?.location && pref?.preferred_states?.includes(jobOrder.location)) score += 50
    if (jobOrder?.department && pref?.preferred_specialties?.includes(jobOrder.department)) score += 50
    return { ...candidate, match_score: score }
  }).sort((a, b) => b.match_score - a.match_score)

  return NextResponse.json(ranked)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const parsed = candidatesSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse(422, "validation_error", "Validation failed", parsed.error.flatten())
  }

  const { data, error } = await supabase
    .from("candidates")
    .insert({ ...parsed.data, account_id: accountId })
    .select("*")
    .single()

  if (error) {
    logApiError("/api/candidates", error)
    return errorResponse(400, "bad_request", "Failed to create candidate")
  }
  return NextResponse.json(data, { status: 201 })
}
