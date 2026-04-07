import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const { data: current } = await supabase
    .from("opportunities")
    .select("stage")
    .eq("id", id)
    .single()

  const { data, error } = await supabase
    .from("opportunities")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (body.stage && current?.stage !== body.stage) {
    await supabase.from("activities").insert({
      object_type: "opportunity",
      object_id: id,
      type: "stage_changed",
      payload: { old_stage: current?.stage, new_stage: body.stage },
    })
  }

  return NextResponse.json(data)
}
