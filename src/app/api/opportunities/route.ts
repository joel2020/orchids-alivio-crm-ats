import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { opportunitiesSchema } from "@/lib/api/schemas"
import { parsePaginationParams } from "@/lib/api/pagination"
import { errorResponse, logApiError } from "@/lib/api/http"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const stage = searchParams.get("stage")
  const owner = searchParams.get("owner_user_id")
  const validStages = new Set(["lead", "qualification", "proposal", "verbal", "won", "lost"])
  let pagination
  try {
    pagination = parsePaginationParams(searchParams)
  } catch (error) {
    return errorResponse(400, "bad_request", (error as Error).message)
  }

  let query = supabase
    .from("opportunities")
    .select("*, companies(*), contacts(*), job_orders(*)")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to)

  if (stage) {
    if (!validStages.has(stage)) return errorResponse(400, "bad_request", "Invalid stage filter")
    query = query.eq("stage", stage)
  }
  if (owner) query = query.eq("owner_user_id", owner)

  const { data, error } = await query
  if (error) {
    logApiError("/api/opportunities", error)
    return errorResponse(400, "bad_request", "Failed to fetch opportunities")
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "bizdev")
  if (auth.response) return auth.response
  const { supabase, accountId, user } = auth.context!

  const parsed = opportunitiesSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse(422, "validation_error", "Validation failed", parsed.error.flatten())
  }

  const { data, error } = await supabase
    .from("opportunities")
    .insert({ ...parsed.data, account_id: accountId, owner_user_id: user.id })
    .select("*")
    .single()

  if (error) {
    logApiError("/api/opportunities", error)
    return errorResponse(400, "bad_request", "Failed to create opportunity")
  }
  return NextResponse.json(data, { status: 201 })
}
