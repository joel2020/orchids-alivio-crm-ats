import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { submissionsSchema } from "@/lib/api/schemas"

function submissionToApplication(row: Record<string, unknown>) {
  return {
    id: row.id,
    candidate_id: row.candidate_id,
    job_id: row.job_order_id,
    stage: row.submission_status,
    status: row.offer_status,
    rejection_reason: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("job_id")
  const candidateId = searchParams.get("candidate_id")
  const stage = searchParams.get("stage")

  let query = supabase
    .from("submissions")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })

  if (jobId) query = query.eq("job_order_id", jobId)
  if (candidateId) query = query.eq("candidate_id", candidateId)
  if (stage) query = query.eq("submission_status", stage)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json((data ?? []).map(submissionToApplication))
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId, user } = auth.context!

  const payload = await request.json()
  const parsed = submissionsSchema.safeParse({
    candidate_id: payload.candidate_id,
    job_order_id: payload.job_id,
    submission_status: payload.stage ?? "draft",
    notes: payload.rejection_reason ?? null,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from("submissions")
    .insert({ ...parsed.data, account_id: accountId })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from("activities").insert({
    account_id: accountId,
    object_type: "submission",
    object_id: data.id,
    type: "submission_created",
    source: "system",
    user_id: user.id,
  })

  return NextResponse.json(submissionToApplication(data), { status: 201 })
}
