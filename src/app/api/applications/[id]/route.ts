import { NextRequest } from "next/server"
import { z } from "zod"
import { requireApiAuth } from "@/lib/auth"
import { dataResponse, errorResponse, logApiError } from "@/lib/api/http"

const applicationUpdateSchema = z
  .object({
    stage: z.string().trim().optional(),
    position: z.number().int().nonnegative().optional(),
    notes: z.string().optional().nullable(),
  })
  .strict()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { id } = await params

  const [appRes, interviewsRes, sequenceRes, activitiesRes] = await Promise.all([
    supabase
      .from("applications")
      .select("*, candidates(*), jobs(*, projects(*, clients(*)))")
      .eq("account_id", accountId)
      .eq("id", id)
      .single(),
    supabase
      .from("interviews")
      .select("*")
      .eq("account_id", accountId)
      .eq("application_id", id)
      .order("start_time", { ascending: true }),
    supabase.from("sequences_inst").select("*").eq("account_id", accountId).eq("application_id", id).single(),
    supabase
      .from("activities")
      .select("*")
      .eq("account_id", accountId)
      .eq("object_type", "application")
      .eq("object_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  if (appRes.error) {
    logApiError("applications.[id].GET", appRes.error, { accountId, id })
    return errorResponse(appRes.error.message, { status: 404 })
  }

  const application = (appRes.data ?? {}) as Record<string, unknown>

  return dataResponse({
    ...application,
    interviews: interviewsRes.data || [],
    sequence: sequenceRes.data || null,
    activities: activitiesRes.data || [],
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { id } = await params
  const parsed = applicationUpdateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse("Validation failed", { status: 422, details: parsed.error.flatten() })
  }

  const { data: currentRaw, error: currentError } = await supabase
    .from("applications")
    .select("stage")
    .eq("account_id", accountId)
    .eq("id", id)
    .single()

  const current = currentRaw as { stage?: string | null } | null

  if (currentError) {
    logApiError("applications.[id].PATCH.current", currentError, { accountId, id })
    return errorResponse(currentError.message, { status: 404 })
  }

  const { data, error } = await supabase
    .from("applications")
    .update({ ...parsed.data, updated_at: new Date().toISOString() } as never)
    .eq("account_id", accountId)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    logApiError("applications.[id].PATCH", error, { accountId, id })
    return errorResponse(error.message)
  }

  if (parsed.data.stage && current?.stage !== parsed.data.stage) {
    await supabase.from("activities").insert({
      account_id: accountId,
      object_type: "application",
      object_id: id,
      type: "stage_changed",
      payload: { old_stage: current?.stage, new_stage: parsed.data.stage },
    } as never)
  }

  return dataResponse(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "admin")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { id } = await params

  const { error } = await supabase.from("applications").delete().eq("account_id", accountId).eq("id", id)
  if (error) {
    logApiError("applications.[id].DELETE", error, { accountId, id })
    return errorResponse(error.message)
  }

  return dataResponse({ success: true })
}
