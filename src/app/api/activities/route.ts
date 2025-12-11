import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const objectType = searchParams.get("object_type")
  const activityType = searchParams.get("activity_type")
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const limit = parseInt(searchParams.get("limit") || "50")

  let query = supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (objectType && objectType !== "all") query = query.eq("object_type", objectType)
  if (activityType && activityType !== "all") query = query.eq("type", activityType)
  if (startDate) query = query.gte("created_at", startDate)
  if (endDate) query = query.lte("created_at", endDate)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.object_type || !body.object_id || !body.type) {
    return NextResponse.json({ error: "object_type, object_id, and type are required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("activities")
    .insert([body])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}
