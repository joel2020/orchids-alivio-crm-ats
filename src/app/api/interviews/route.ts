import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const applicationId = searchParams.get("application_id")
  const status = searchParams.get("status")
  const stage = searchParams.get("stage")
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")

  let query = supabase
    .from("interviews")
    .select("*, applications(*, candidates(*), jobs(*, projects(*, clients(*))))")
    .eq("account_id", accountId)
    .order("start_time", { ascending: true })

  if (applicationId) query = query.eq("application_id", applicationId)
  if (status && status !== "all") query = query.eq("status", status)
  if (stage && stage !== "all") query = query.eq("stage", stage)
  if (startDate) query = query.gte("start_time", startDate)
  if (endDate) query = query.lte("start_time", endDate)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const body = await request.json()

  if (!body.application_id) {
    return NextResponse.json({ error: "application_id is required" }, { status: 400 })
  }

  if (!body.start_time) {
    return NextResponse.json({ error: "start_time is required" }, { status: 400 })
  }

  const startTime = new Date(body.start_time)
  if (startTime <= new Date()) {
    return NextResponse.json({ error: "Interview must be scheduled in the future" }, { status: 400 })
  }

  const { data: appExists } = await supabase
    .from("applications")
    .select("id")
    .eq("account_id", accountId)
    .eq("id", body.application_id)
    .single()

  if (!appExists) {
    return NextResponse.json({ error: "Application not found" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("interviews")
    .insert([{
      ...body,
      account_id: accountId,
      status: body.status || "scheduled"
    }])
    .select("*, applications(*, candidates(*), jobs(*))")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    object_type: "interview",
    object_id: data.id,
    type: "interview_scheduled",
    payload: {
      candidate_name: data.applications?.candidates?.full_name,
      job_title: data.applications?.jobs?.title,
      start_time: data.start_time
    }
  })

  return NextResponse.json(data, { status: 201 })
}
