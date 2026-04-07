import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Note content is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("notes")
    .insert([{ entity_type: "opportunity", entity_id: id, content: body.content }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase.from("activities").insert({
    object_type: "opportunity",
    object_id: id,
    type: "note_added",
    payload: {},
  })

  return NextResponse.json(data, { status: 201 })
}
