import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("job_id")
  const candidateId = searchParams.get("candidate_id")
  const stage = searchParams.get("stage")
  const view = searchParams.get("view")

  let query = supabase
    .from("applications")
    .select("*, candidates(*), jobs(*, projects(*, clients(*)))")
    .eq("account_id", accountId)
    .order("position", { ascending: true })

  if (jobId) query = query.eq("job_id", jobId)
  if (candidateId) query = query.eq("candidate_id", candidateId)
  if (stage && stage !== "all") query = query.eq("stage", stage)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (view === "board" && jobId) {
    const stages = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']
    const board = stages.reduce((acc, s) => {
      acc[s] = (data || []).filter(app => app.stage === s).sort((a, b) => a.position - b.position)
      return acc
    }, {} as Record<string, typeof data>)
    return NextResponse.json(board)
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const body = await request.json()

  if (!body.candidate_id || !body.job_id) {
    return NextResponse.json({ error: "candidate_id and job_id are required" }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("account_id", accountId)
    .eq("candidate_id", body.candidate_id)
    .eq("job_id", body.job_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: "Candidate has already applied for this job" }, { status: 400 })
  }

  const { data: jobExists } = await supabase
    .from("jobs")
    .select("id")
    .eq("account_id", accountId)
    .eq("id", body.job_id)
    .single()

  if (!jobExists) {
    return NextResponse.json({ error: "Job not found" }, { status: 400 })
  }

  const { count } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("stage", body.stage || "applied")

  const { data, error } = await supabase
    .from("applications")
    .insert([{
      ...body,
      account_id: accountId,
      stage: body.stage || "applied",
      position: count || 0
    }])
    .select("*, candidates(*), jobs(*)")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    object_type: "application",
    object_id: data.id,
    type: "application_created",
    payload: { candidate_name: data.candidates?.full_name, job_title: data.jobs?.title }
  })

  return NextResponse.json(data, { status: 201 })
}
