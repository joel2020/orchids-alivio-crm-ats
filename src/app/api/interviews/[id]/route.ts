import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const validTransitions: Record<string, string[]> = {
  scheduled: ["completed", "canceled", "no_show"],
  completed: [],
  canceled: [],
  no_show: []
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from("interviews")
    .select("*, applications(*, candidates(*), jobs(*, projects(*, clients(*))))")
    .eq("id", id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const { data: current } = await supabase
    .from("interviews")
    .select("status")
    .eq("id", id)
    .single()

  if (body.status && current?.status) {
    const allowed = validTransitions[current.status] || []
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${current.status} to ${body.status}` },
        { status: 400 }
      )
    }
  }

  const { data, error } = await supabase
    .from("interviews")
    .update(body)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (body.status === "completed") {
    await supabase.from("activities").insert({
      object_type: "interview",
      object_id: id,
      type: "interview_completed",
      payload: {}
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
    .from("interviews")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
