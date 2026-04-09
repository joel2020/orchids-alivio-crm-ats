import { NextRequest } from "next/server"
import { z } from "zod"
import { requireApiAuth } from "@/lib/auth"
import { dataResponse, errorResponse, logApiError, parsePagination } from "@/lib/api/http"

const applicationCreateSchema = z.object({
  candidate_id: z.uuid(),
  job_id: z.uuid(),
  stage: z.string().trim().optional(),
})

const pipelineStages = [
  "sourced",
  "contacted",
  "replied",
  "qualified",
  "submitted",
  "client_interview",
  "final_interview",
  "offer",
  "placed",
  "rejected",
  "nurture",
]

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("job_id")
  const candidateId = searchParams.get("candidate_id")
  const stage = searchParams.get("stage")
  const view = searchParams.get("view")
  const { page, limit, offset } = parsePagination(searchParams, { defaultLimit: 100, maxLimit: 200 })

  let query = supabase
    .from("applications")
    .select("*, candidates(*), jobs(*, projects(*, clients(*)))", { count: "exact" })
    .eq("account_id", accountId)
    .order("position", { ascending: true })

  if (jobId) query = query.eq("job_id", jobId)
  if (candidateId) query = query.eq("candidate_id", candidateId)
  if (stage && stage !== "all") query = query.eq("stage", stage)

  if (!(view === "board" && jobId)) {
    query = query.range(offset, offset + limit - 1)
  }

  const { data, error, count } = await query
  if (error) {
    logApiError("applications.GET", error, { accountId, jobId, candidateId, stage, view })
    return errorResponse(error.message)
  }

  if (view === "board" && jobId) {
    const board = pipelineStages.reduce<Record<string, typeof data>>((acc, currentStage) => {
      acc[currentStage] = (data || [])
        .filter((app) => app.stage === currentStage)
        .sort((a, b) => a.position - b.position)
      return acc
    }, {})

    return dataResponse(board)
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
  const { supabase, accountId } = auth.context!

  const parsed = applicationCreateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse("Validation failed", { status: 422, details: parsed.error.flatten() })
  }

  const payload = parsed.data

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("account_id", accountId)
    .eq("candidate_id", payload.candidate_id)
    .eq("job_id", payload.job_id)
    .maybeSingle()

  if (existing) {
    return errorResponse("Candidate is already in this job pipeline")
  }

  const { data: jobExists } = await supabase
    .from("jobs")
    .select("id")
    .eq("account_id", accountId)
    .eq("id", payload.job_id)
    .maybeSingle()

  if (!jobExists) {
    return errorResponse("Job not found")
  }

  const targetStage = payload.stage || "sourced"
  const { count, error: countError } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("stage", targetStage)

  if (countError) {
    logApiError("applications.POST.count", countError, { accountId, stage: targetStage })
    return errorResponse(countError.message)
  }

  const { data, error } = await supabase
    .from("applications")
    .insert([
      {
        ...payload,
        account_id: accountId,
        stage: targetStage,
        position: count || 0,
      },
    ])
    .select("*, candidates(*), jobs(*)")
    .single()

  if (error) {
    logApiError("applications.POST", error, { accountId })
    return errorResponse(error.message)
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    object_type: "application",
    object_id: data.id,
    type: "application_created",
    payload: { candidate_name: data.candidates?.full_name, job_title: data.jobs?.title },
  })

  return dataResponse(data, { status: 201 })
}
