import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const applicationId = searchParams.get("application_id")
  const status = searchParams.get("status")
  const stage = searchParams.get("stage")
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")

  let query = supabase
    .from("interviews")
    .select("*, applications(*, candidates(*), jobs(*, projects(*, clients(*))))")
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
    .eq("id", body.application_id)
    .single()

  if (!appExists) {
    return NextResponse.json({ error: "Application not found" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("interviews")
    .insert([{
      ...body,
      status: body.status || "scheduled"
    }])
    .select("*, applications(*, candidates(*), jobs(*))")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase.from("activities").insert({
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
