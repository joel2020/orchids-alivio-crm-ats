import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [appRes, interviewsRes, sequenceRes, activitiesRes] = await Promise.all([
    supabase.from("applications").select("*, candidates(*), jobs(*, projects(*, clients(*)))").eq("id", id).single(),
    supabase.from("interviews").select("*").eq("application_id", id).order("start_time", { ascending: true }),
    supabase.from("sequences_inst").select("*").eq("application_id", id).single(),
    supabase.from("activities").select("*").eq("object_type", "application").eq("object_id", id).order("created_at", { ascending: false }).limit(20)
  ])

  if (appRes.error) {
    return NextResponse.json({ error: appRes.error.message }, { status: 404 })
  }

  return NextResponse.json({
    ...appRes.data,
    interviews: interviewsRes.data || [],
    sequence: sequenceRes.data || null,
    activities: activitiesRes.data || []
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const { data: current } = await supabase
    .from("applications")
    .select("stage")
    .eq("id", id)
    .single()

  const { data, error } = await supabase
    .from("applications")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (body.stage && current?.stage !== body.stage) {
    await supabase.from("activities").insert({
      object_type: "application",
      object_id: id,
      type: "stage_changed",
      payload: { old_stage: current?.stage, new_stage: body.stage }
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
