import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.full_name?.trim()) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("candidates")
    .insert([body])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase.from("activities").insert({
    object_type: "candidate",
    object_id: data.id,
    type: "candidate_created",
    payload: { name: data.full_name },
  })

  return NextResponse.json(data, { status: 201 })
}
