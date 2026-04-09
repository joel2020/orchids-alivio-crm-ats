import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { requireApiAuth } from "@/lib/auth"
import { dataResponse, errorResponse, logApiError } from "@/lib/api/http"
import type { Database } from "@/lib/database.types"
import { env } from "@/lib/env"

const applicationUpdateSchema = z
  .object({
    stage: z.string().trim().optional(),
    position: z.number().int().nonnegative().optional(),
    notes: z.string().optional().nullable(),
  })
  .strict()

type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"]
type ApplicationUpdate = Database["public"]["Tables"]["applications"]["Update"]
type ActivityInsert = Database["public"]["Tables"]["activities"]["Insert"]
type InterviewRow = Database["public"]["Tables"]["interviews"]["Row"]
type SequenceRow = Database["public"]["Tables"]["sequences_inst"]["Row"]
type ActivityRow = Database["public"]["Tables"]["activities"]["Row"]

type ApplicationDetail = ApplicationRow & {
  candidates?: Record<string, unknown> | null
  jobs?: Record<string, unknown> | null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { accessToken, accountId } = auth.context!
  const supabase = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const { id } = await params

  const [appRes, interviewsRes, sequenceRes, activitiesRes] = await Promise.all([
    supabase
      .from("applications")
      .select("*, candidates(*), jobs(*, projects(*, clients(*)))")
      .eq("account_id", accountId)
      .eq("id", id)
      .returns<ApplicationDetail[]>()
      .single(),
    supabase
      .from("interviews")
      .select("*")
      .eq("account_id", accountId)
      .eq("application_id", id)
      .returns<InterviewRow[]>()
      .order("start_time", { ascending: true }),
    supabase
      .from("sequences_inst")
      .select("*")
      .eq("account_id", accountId)
      .eq("application_id", id)
      .returns<SequenceRow[]>()
      .single(),
    supabase
      .from("activities")
      .select("*")
      .eq("account_id", accountId)
      .eq("object_type", "application")
      .eq("object_id", id)
      .returns<ActivityRow[]>()
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  if (appRes.error) {
    logApiError("applications.[id].GET", appRes.error, { accountId, id })
    return errorResponse(appRes.error.message, { status: 404 })
  }

  const application = appRes.data

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
  const { accessToken, accountId } = auth.context!
  const supabase = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const { id } = await params
  const parsed = applicationUpdateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse("Validation failed", { status: 422, details: parsed.error.flatten() })
  }

  const { data: current, error: currentError } = await supabase
    .from("applications")
    .select("stage")
    .eq("account_id", accountId)
    .eq("id", id)
    .returns<Pick<ApplicationRow, "stage">[]>()
    .single()

  if (currentError) {
    logApiError("applications.[id].PATCH.current", currentError, { accountId, id })
    return errorResponse(currentError.message, { status: 404 })
  }

  const updatePayload: ApplicationUpdate = { ...parsed.data, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from("applications")
    .update<ApplicationUpdate>(updatePayload)
    .eq("account_id", accountId)
    .eq("id", id)
    .select()
    .returns<ApplicationRow[]>()
    .single()

  if (error) {
    logApiError("applications.[id].PATCH", error, { accountId, id })
    return errorResponse(error.message)
  }

  if (parsed.data.stage && current?.stage !== parsed.data.stage) {
    const activityPayload: ActivityInsert = {
      account_id: accountId,
      object_type: "application",
      object_id: id,
      type: "stage_changed",
      payload: { old_stage: current?.stage, new_stage: parsed.data.stage },
    }

    await supabase.from("activities").insert(activityPayload)
  }

  return dataResponse(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "admin")
  if (auth.response) return auth.response
  const { accessToken, accountId } = auth.context!
  const supabase = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const { id } = await params

  const { error } = await supabase.from("applications").delete().eq("account_id", accountId).eq("id", id)
  if (error) {
    logApiError("applications.[id].DELETE", error, { accountId, id })
    return errorResponse(error.message)
  }

  return dataResponse({ success: true })
}
